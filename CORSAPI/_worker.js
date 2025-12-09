// 统一入口：兼容 Cloudflare Workers 和 Pages Functions
export default {
  async fetch(request, env, ctx) {
    // Pages Functions 中 KV 需要从 env 中获取
    if (env && env.KV && typeof globalThis.KV === 'undefined') {
      globalThis.KV = env.KV
    }
    
    return handleRequest(request)
  }
}

// 常量配置（避免重复创建）
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

const EXCLUDE_HEADERS = new Set([
  'content-encoding', 'content-length', 'transfer-encoding',
  'connection', 'keep-alive', 'set-cookie', 'set-cookie2'
])

const JSON_SOURCES = {
  'jin18': 'https://raw.githubusercontent.com/daihuan0612/tvyuan/main/jin18.json',
  'jingjian': 'https://raw.githubusercontent.com/daihuan0612/tvyuan/main/jingjian.json',
  'full': 'https://raw.githubusercontent.com/daihuan0612/tvyuan/main/LunaTV-config.json'
}

const FORMAT_CONFIG = {
  '0': { proxy: false, base58: false },
  'raw': { proxy: false, base58: false },
  '1': { proxy: true, base58: false },
  'proxy': { proxy: true, base58: false },
  '2': { proxy: false, base58: true },
  'base58': { proxy: false, base58: true },
  '3': { proxy: true, base58: true },
  'proxy-base58': { proxy: true, base58: true }
}

// Base58 编码函数
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
function base58Encode(obj) {
  const str = JSON.stringify(obj)
  const bytes = new TextEncoder().encode(str)
  
  let intVal = 0n
  for (let b of bytes) {
    intVal = (intVal << 8n) + BigInt(b)
  }
  
  let result = ''
  while (intVal > 0n) {
    const mod = intVal % 58n
    result = BASE58_ALPHABET[Number(mod)] + result
    intVal = intVal / 58n
  }
  
  for (let b of bytes) {
    if (b === 0) result = BASE58_ALPHABET[0] + result
    else break
  }
  
  return result
}

// JSON api 字段前缀替换
function addOrReplacePrefix(obj, newPrefix) {
  if (typeof obj !== 'object' || obj === null) return obj
  if (Array.isArray(obj)) return obj.map(item => addOrReplacePrefix(item, newPrefix))
  const newObj = {}
  for (const key in obj) {
    if (key === 'api' && typeof obj[key] === 'string') {
      let apiUrl = obj[key]
      const urlIndex = apiUrl.indexOf('?url=')
      if (urlIndex !== -1) apiUrl = apiUrl.slice(urlIndex + 5)
      if (!apiUrl.startsWith(newPrefix)) apiUrl = newPrefix + apiUrl
      newObj[key] = apiUrl
    } else {
      newObj[key] = addOrReplacePrefix(obj[key], newPrefix)
    }
  }
  return newObj
}

// ---------- 安全版：KV 缓存 ----------
async function getCachedJSON(url) {
  try {
    // 直接从网络获取数据，避免内嵌配置过大导致的部署问题
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }
    
    // 解析获取到的JSON数据
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching JSON:', error);
    // 如果获取失败，返回空结构而不是内嵌数据
    return {
      "cache_time": 7200,
      "api_site": {}
    };
  }
}

// ---------- 安全版：错误日志 ----------
async function logError(type, info) {
  // 保留错误输出，便于调试
  console.error('[ERROR]', type, info)
  
  // 禁止写入 KV
  return
}

// ---------- 主逻辑 ----------
async function handleRequest(request) {
  // 快速处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  
  const reqUrl = new URL(request.url)
  const pathname = reqUrl.pathname
  const targetUrlParam = reqUrl.searchParams.get('url')
  const formatParam = reqUrl.searchParams.get('format')
  const prefixParam = reqUrl.searchParams.get('prefix')
  const sourceParam = reqUrl.searchParams.get('source')
  
  const currentOrigin = reqUrl.origin
  const defaultPrefix = currentOrigin + '/?url='
  
  // 🩺 健康检查（最常见的性能检查，提前处理）
  if (pathname === '/health') {
    return new Response('OK', { status: 200, headers: CORS_HEADERS })
  }
  
  // 通用代理请求处理
  if (targetUrlParam) {
    return handleProxyRequest(request, targetUrlParam, currentOrigin)
  }
  
  // JSON 格式输出处理
  if (formatParam !== null) {
    return handleFormatRequest(formatParam, sourceParam, prefixParam, defaultPrefix)
  }
  
  // 返回首页文档
  return handleHomePage(currentOrigin, defaultPrefix)
}

// ---------- 代理请求处理子模块 ----------
async function handleProxyRequest(request, targetUrlParam, currentOrigin) {
  // 🚨 防止递归调用自身
  if (targetUrlParam.startsWith(currentOrigin)) {
    return errorResponse('Loop detected: self-fetch blocked', { url: targetUrlParam }, 400)
  }
  
  // 🚨 防止无效 URL
  if (!/^https?:\/\//i.test(targetUrlParam)) {
    return errorResponse('Invalid target URL', { url: targetUrlParam }, 400)
  }
  
  let fullTargetUrl = targetUrlParam
  const urlMatch = request.url.match(/[?&]url=([^&]+(?:&.*)?)/)
  if (urlMatch) fullTargetUrl = decodeURIComponent(urlMatch[1])
  
  let targetURL
  try {
    targetURL = new URL(fullTargetUrl)
  } catch {
    await logError('proxy', { message: 'Invalid URL', url: fullTargetUrl })
    return errorResponse('Invalid URL', { url: fullTargetUrl }, 400)
  }
  
  try {
    const proxyRequest = new Request(targetURL.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.arrayBuffer()
        : undefined,
    })
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 9000)
    const response = await fetch(proxyRequest, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    const responseHeaders = new Headers(CORS_HEADERS)
    for (const [key, value] of response.headers) {
      if (!EXCLUDE_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    }
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    })
  } catch (err) {
    await logError('proxy', { message: err.message || '代理请求失败', url: fullTargetUrl })
    return errorResponse('Proxy Error', {
      message: err.message || '代理请求失败',
      target: fullTargetUrl,
      timestamp: new Date().toISOString()
    }, 502)
  }
}

// ---------- JSON 格式输出处理子模块 ----------
async function handleFormatRequest(formatParam, sourceParam, prefixParam, defaultPrefix) {
  try {
    const config = FORMAT_CONFIG[formatParam]
    if (!config) {
      return errorResponse('Invalid format parameter', { format: formatParam }, 400)
    }
    
    const selectedSource = JSON_SOURCES[sourceParam] || JSON_SOURCES['full']
    // 添加调试日志
    console.log('Fetching data from:', selectedSource)
    
    const data = await getCachedJSON(selectedSource)
    
    const newData = config.proxy
      ? addOrReplacePrefix(data, prefixParam || defaultPrefix)
      : data
    
    if (config.base58) {
      const encoded = base58Encode(newData)
      return new Response(encoded, {
        headers: { 'Content-Type': 'text/plain;charset=UTF-8', ...CORS_HEADERS },
      })
    } else {
      return new Response(JSON.stringify(newData), {
        headers: { 'Content-Type': 'application/json;charset=UTF-8', ...CORS_HEADERS },
      })
    }
  } catch (err) {
    await logError('json', { message: err.message, stack: err.stack })
    return errorResponse('Failed to fetch or process JSON data: ' + err.message, {}, 500)
  }
}

// ---------- 首页文档处理 ----------
async function handleHomePage(currentOrigin, defaultPrefix) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CORSAPI - LunaTV API 中转代理服务</title>
  <style>
    :root {
      --primary-color: #4a6cf7;
      --secondary-color: #6c757d;
      --success-color: #28a745;
      --background-color: #f8f9fa;
      --card-background: #ffffff;
      --border-color: #e9ecef;
      --text-primary: #212529;
      --text-secondary: #6c757d;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; 
      background-color: var(--background-color);
      color: var(--text-primary);
      line-height: 1.6; 
      padding: 16px;
    }
    
    .container { 
      max-width: 1200px; 
      margin: 0 auto; 
      padding: 0 12px; 
    }
    
    header { 
      text-align: center; 
      padding: 24px 0; 
      margin-bottom: 24px; 
      border-bottom: 1px solid var(--border-color);
    }
    
    h1 { 
      color: var(--primary-color); 
      font-size: 2rem; 
      margin-bottom: 8px; 
    }
    
    h2 { 
      color: var(--text-primary); 
      font-size: 1.5rem; 
      margin: 24px 0 16px; 
      padding-bottom: 8px; 
      border-bottom: 1px solid var(--border-color);
    }
    
    h3 { 
      color: var(--text-primary); 
      font-size: 1.25rem; 
      margin: 0 0 16px; 
    }
    
    p { 
      margin-bottom: 16px; 
      color: var(--text-secondary); 
    }
    
    code { 
      background: var(--card-background); 
      padding: 4px 8px; 
      border-radius: 4px; 
      font-size: 0.9rem; 
      border: 1px solid var(--border-color);
      word-break: break-all;
    }
    
    pre { 
      background: var(--card-background); 
      padding: 16px; 
      border-radius: 8px; 
      overflow-x: auto; 
      border: 1px solid var(--border-color);
      margin: 16px 0;
    }
    
    .card { 
      background: var(--card-background); 
      padding: 20px; 
      border-radius: 8px; 
      margin: 16px 0; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      border: 1px solid var(--border-color);
    }
    
    .section { 
      background: var(--card-background); 
      padding: 20px; 
      border-radius: 8px; 
      margin: 16px 0; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      border: 1px solid var(--border-color);
    }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 16px 0; 
      background: var(--card-background);
      border-radius: 8px;
      overflow: hidden;
    }
    
    table td { 
      padding: 12px; 
      border-bottom: 1px solid var(--border-color);
    }
    
    table tr:last-child td { 
      border-bottom: none; 
    }
    
    table td:first-child { 
      background: #f8f9fa; 
      font-weight: 600; 
      width: 30%; 
    }
    
    ul { 
      padding-left: 20px; 
      margin: 16px 0; 
    }
    
    li { 
      margin-bottom: 8px; 
    }
    
    .btn { 
      display: inline-block;
      padding: 8px 16px;
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
      margin: 4px 0;
    }
    
    .btn:hover { 
      background: #3a5af5; 
      transform: translateY(-1px);
    }
    
    .btn-copy { 
      background: #28a745; 
    }
    
    .btn-copy:hover { 
      background: #218838; 
    }
    
    .grid { 
      display: grid; 
      gap: 16px; 
    }
    
    @media (min-width: 768px) {
      .grid { 
        grid-template-columns: repeat(2, 1fr); 
      }
      
      body { 
        padding: 24px; 
      }
      
      h1 { 
        font-size: 2.5rem; 
      }
      
      h2 { 
        font-size: 1.75rem; 
      }
    }
    
    @media (min-width: 1024px) {
      .grid { 
        grid-template-columns: repeat(3, 1fr); 
      }
    }
    
    .notification { 
      position: fixed; 
      top: 20px; 
      right: 20px; 
      padding: 12px 20px; 
      background: var(--success-color); 
      color: white; 
      border-radius: 4px; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(200%);
      transition: transform 0.3s ease-out;
      z-index: 1000;
    }
    
    .notification.show { 
      transform: translateX(0); 
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔄 CORSAPI 中转代理服务</h1>
      <p>通用 API 中转代理，用于访问被墙或限制的接口</p>
    </header>
    
    <div class="card">
      <h2>🔗 使用方法</h2>
      <p>中转任意 API：在请求 URL 后添加 <code>?url=目标地址</code> 参数</p>
      <pre>${defaultPrefix}&lt;示例API地址&gt;</pre>
    </div>
    
    <div class="card">
      <h2>⚙️ 配置订阅参数说明</h2>
      <table>
        <tr>
          <td>format</td>
          <td><code>0</code> 或 <code>raw</code> = 原始 JSON<br>
              <code>1</code> 或 <code>proxy</code> = 添加代理前缀<br>
              <code>2</code> 或 <code>base58</code> = 原始 Base58 编码<br>
              <code>3</code> 或 <code>proxy-base58</code> = 代理 Base58 编码</td>
        </tr>
        <tr>
          <td>source</td>
          <td><code>jin18</code> = 精简版<br>
              <code>jingjian</code> = 精简版+成人<br>
              <code>full</code> = 完整版（默认）</td>
        </tr>
        <tr>
          <td>prefix</td>
          <td>自定义代理前缀（仅在 format=1 或 3 时生效）</td>
        </tr>
      </table>
    </div>
    
    <h2>📋 配置订阅链接示例</h2>
    
    <div class="grid">
      <div class="card">
        <h3>📱 精简版（jin18）</h3>
        <p><strong>原始 JSON：</strong><br><code class="copyable">${currentOrigin}?format=0&source=jin18</code> <button class="btn btn-copy copy-btn" data-idx="0">复制</button></p>
        <p><strong>中转代理 JSON：</strong><br><code class="copyable">${currentOrigin}?format=1&source=jin18</code> <button class="btn btn-copy copy-btn" data-idx="1">复制</button></p>
        <p><strong>原始 Base58：</strong><br><code class="copyable">${currentOrigin}?format=2&source=jin18</code> <button class="btn btn-copy copy-btn" data-idx="2">复制</button></p>
        <p><strong>中转 Base58：</strong><br><code class="copyable">${currentOrigin}?format=3&source=jin18</code> <button class="btn btn-copy copy-btn" data-idx="3">复制</button></p>
      </div>
      
      <div class="card">
        <h3>📺 精简版+成人（jingjian）</h3>
        <p><strong>原始 JSON：</strong><br><code class="copyable">${currentOrigin}?format=0&source=jingjian</code> <button class="btn btn-copy copy-btn" data-idx="4">复制</button></p>
        <p><strong>中转代理 JSON：</strong><br><code class="copyable">${currentOrigin}?format=1&source=jingjian</code> <button class="btn btn-copy copy-btn" data-idx="5">复制</button></p>
        <p><strong>原始 Base58：</strong><br><code class="copyable">${currentOrigin}?format=2&source=jingjian</code> <button class="btn btn-copy copy-btn" data-idx="6">复制</button></p>
        <p><strong>中转 Base58：</strong><br><code class="copyable">${currentOrigin}?format=3&source=jingjian</code> <button class="btn btn-copy copy-btn" data-idx="7">复制</button></p>
      </div>
      
      <div class="card">
        <h3>🎬 完整版（full，默认）</h3>
        <p><strong>原始 JSON：</strong><br><code class="copyable">${currentOrigin}?format=0&source=full</code> <button class="btn btn-copy copy-btn" data-idx="8">复制</button></p>
        <p><strong>中转代理 JSON：</strong><br><code class="copyable">${currentOrigin}?format=1&source=full</code> <button class="btn btn-copy copy-btn" data-idx="9">复制</button></p>
        <p><strong>原始 Base58：</strong><br><code class="copyable">${currentOrigin}?format=2&source=full</code> <button class="btn btn-copy copy-btn" data-idx="10">复制</button></p>
        <p><strong>中转 Base58：</strong><br><code class="copyable">${currentOrigin}?format=3&source=full</code> <button class="btn btn-copy copy-btn" data-idx="11">复制</button></p>
      </div>
    </div>
    
    <div class="card">
      <h2>✨ 支持的功能</h2>
      <ul>
        <li>✅ 支持 GET、POST、PUT、DELETE 等所有 HTTP 方法</li>
        <li>✅ 自动转发请求头和请求体</li>
        <li>✅ 保留原始响应头（除敏感信息）</li>
        <li>✅ 完整的 CORS 支持</li>
        <li>✅ 超时保护（9 秒）</li>
        <li>✅ 支持多种配置源切换</li>
        <li>✅ 支持 Base58 编码输出</li>
      </ul>
    </div>
  </div>
  
  <div id="notification" class="notification">已复制到剪贴板！</div>
  
  <script>
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        const text = document.querySelectorAll('.copyable')[idx].innerText;
        navigator.clipboard.writeText(text).then(() => {
          const notification = document.getElementById('notification');
          notification.classList.add('show');
          setTimeout(() => {
            notification.classList.remove('show');
          }, 2000);
        });
      });
    });
  </script>
</body>
</html>`

  return new Response(html, { 
    status: 200, 
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS } 
  })
}

// ---------- 统一错误响应处理 ----------
function errorResponse(error, data = {}, status = 400) {
  return new Response(JSON.stringify({ error, ...data }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
  })
}
