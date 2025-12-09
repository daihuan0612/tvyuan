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
  // 使用内嵌配置数据，避免依赖外部文件
  const sourceMap = {
    'https://raw.githubusercontent.com/daihuan0612/tvyuan/main/LunaTV-config.json': 'full',
    'https://raw.githubusercontent.com/daihuan0612/tvyuan/main/jingjian.json': 'jingjian',
    'https://raw.githubusercontent.com/daihuan0612/tvyuan/main/jin18.json': 'jin18'
  };
  
  const sourceType = sourceMap[url];
  if (sourceType && EMBEDDED_CONFIGS[sourceType]) {
    console.log(`Using embedded config for ${sourceType}`);
    return EMBEDDED_CONFIGS[sourceType];
  }
  
  const kvAvailable = typeof KV !== 'undefined' && KV && typeof KV.get === 'function'
  
  if (kvAvailable) {
    const cacheKey = 'CACHE_' + url
    const cached = await KV.get(cacheKey)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch (e) {
        console.error('Cache parse error:', e.message)
        await KV.delete(cacheKey)
      }
    }
    const res = await fetch(url)
    console.log(`Fetch status for ${url}:`, res.status)
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText} for URL: ${url}`)
    const text = await res.text()
    console.log(`Response text length:`, text.length)
    try {
      const data = JSON.parse(text)
      await KV.put(cacheKey, text, { expirationTtl: 600 })   // 缓存十分钟
      return data
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message)
      console.error('Response text preview:', text.substring(0, 500))
      throw new Error(`JSON parse failed: ${parseError.message} for URL: ${url}`)
    }
  } else {
    // 如果无法从外部获取，使用内嵌配置作为后备
    console.log(`Using embedded config as fallback for ${url}`);
    return EMBEDDED_CONFIGS['full'] || {
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

// JSON配置数据（内嵌版本，避免依赖外部文件）
const EMBEDDED_CONFIGS = {
  'full': {
    "cache_time": 7200,
    "api_site": {
      "iqiyizyapi.com": {
        "name": "🎬-爱奇艺-",
        "api": "https://iqiyizyapi.com/api.php/provide/vod",
        "detail": "https://iqiyizyapi.com"
      },
      "dbzy.tv": {
        "name": "🎬豆瓣资源",
        "api": "https://caiji.dbzy5.com/api.php/provide/vod",
        "detail": "dbzy.tv"
      },
      "tyyszy.com": {
        "name": "🎬天涯影视",
        "api": "https://tyyszy.com/api.php/provide/vod",
        "detail": "https://tyyszy.com"
      },
      "mtzy.me": {
        "name": "🎬茅台资源",
        "api": "https://caiji.maotaizy.cc/api.php/provide/vod",
        "detail": "https://mtzy.me"
      },
      "wolongzyw.com": {
        "name": "🎬卧龙资源",
        "api": "https://wolongzyw.com/api.php/provide/vod",
        "detail": "https://wolongzyw.com"
      },
      "ikunzy.com": {
        "name": "🎬iKun资源",
        "api": "https://ikunzyapi.com/api.php/provide/vod",
        "detail": "https://ikunzy.com"
      },
      "dyttzyapi.com": {
        "name": "🎬电影天堂",
        "api": "http://caiji.dyttzyapi.com/api.php/provide/vod",
        "detail": "http://caiji.dyttzyapi.com"
      },
      "www.maoyanzy.com": {
        "name": "🎬猫眼资源",
        "api": "https://api.maoyanapi.top/api.php/provide/vod",
        "detail": "https://www.maoyanzy.com"
      },
      "cj.lzcaiji.com": {
        "name": "🎬量子资源",
        "api": "https://cj.lzcaiji.com/api.php/provide/vod",
        "detail": "https://cj.lzcaiji.com"
      },
      "360zy.com": {
        "name": "🎬360 资源",
        "api": "https://360zy.com/api.php/provide/vod",
        "detail": "https://360zy.com"
      },
      "jszyapi.com": {
        "name": "🎬极速资源",
        "api": "https://jszyapi.com/api.php/provide/vod",
        "detail": "https://jszyapi.com"
      },
      "www.moduzy.net": {
        "name": "🎬魔都资源",
        "api": "https://www.mdzyapi.com/api.php/provide/vod",
        "detail": "https://www.moduzy.net"
      },
      "ffzyapi.com": {
        "name": "🎬非凡资源",
        "api": "https://api.ffzyapi.com/api.php/provide/vod",
        "detail": "https://cj.ffzyapi.com"
      },
      "bfzy.tv": {
        "name": "🎬暴风资源",
        "api": "https://bfzyapi.com/api.php/provide/vod",
        "detail": "https://bfzy.tv"
      },
      "zuida.xyz": {
        "name": "🎬最大资源",
        "api": "https://api.zuidapi.com/api.php/provide/vod",
        "detail": "https://zuida.xyz"
      },
      "wujinzy.me": {
        "name": "🎬无尽资源",
        "api": "https://api.wujinapi.me/api.php/provide/vod",
        "detail": "https://wujinzy.com"
      },
      "xinlangapi.com": {
        "name": "🎬新浪资源",
        "api": "https://api.xinlangapi.com/xinlangapi.php/provide/vod",
        "detail": "https://xinlangapi.com"
      },
      "api.wwzy.tv": {
        "name": "🎬旺旺资源",
        "api": "https://api.wwzy.tv/api.php/provide/vod",
        "detail": "https://api.wwzy.tv"
      },
      "www.subozy.com": {
        "name": "🎬速播资源",
        "api": "https://subocaiji.com/api.php/provide/vod",
        "detail": "www.subozy.com"
      },
      "jinyingzy.com": {
        "name": "🎬金鹰点播",
        "api": "https://jinyingzy.com/api.php/provide/vod",
        "detail": "https://jinyingzy.com"
      },
      "p2100.net": {
        "name": "🎬飘零资源",
        "api": "https://p2100.net/api.php/provide/vod",
        "detail": "https://p2100.net"
      },
      "api.ukuapi88.com": {
        "name": "🎬U酷影视",
        "api": "https://api.ukuapi88.com/api.php/provide/vod",
        "detail": "https://www.ukuzy.com"
      },
      "api.guangsuapi.com": {
        "name": "🎬光速资源",
        "api": "https://api.guangsuapi.com/api.php/provide/vod",
        "detail": "https://api.guangsuapi.com"
      },
      "www.hongniuzy.com": {
        "name": "🎬红牛资源",
        "api": "https://www.hongniuzy2.com/api.php/provide/vod",
        "detail": "https://www.hongniuzy.com"
      },
      "caiji.moduapi.cc": {
        "name": "🎬魔都动漫",
        "api": "https://caiji.moduapi.cc/api.php/provide/vod",
        "detail": "https://caiji.moduapi.cc"
      },
      "www.ryzyw.com": {
        "name": "🎬如意资源",
        "api": "https://jjpz.hafrey.dpdns.org/?url=https://cj.rycjapi.com/api.php/provide/vod",
        "detail": "https://www.ryzyw.com"
      },
      "www.haohuazy.com": {
        "name": "🎬豪华资源",
        "api": "https://jjpz.hafrey.dpdns.org/?url=https://hhzyapi.com/api.php/provide/vod",
        "detail": "https://www.haohuazy.com"
      },
      "bdzy1.com": {
        "name": "🎬百度云zy",
        "api": "https://pz.168188.dpdns.org/?url=https://api.apibdzy.com/api.php/provide/vod",
        "detail": "https://bdzy1.com"
      },
      "zy.sh0o.cn": {
        "name": "🎬山海资源",
        "api": "https://zy.sh0o.cn/api.php/provide/vod",
        "detail": "https://zy.sh0o.cn"
      },
      "lzizy.net": {
        "_comment": "备用",
        "name": "🎬量子影视",
        "api": "https://cj.lziapi.com/api.php/provide/vod",
        "detail": "https://lzizy.net"
      },
      "zuidazy.co": {
        "name": "🎬最大点播",
        "api": "https://zuidazy.me/api.php/provide/vod",
        "detail": "https://zuidazy.co"
      },
      "wujinzy.com": {
        "name": "🎬无尽影视",
        "api": "https://api.wujinapi.com/api.php/provide/vod",
        "detail": "https://wujinzy.com"
      },
      "wwzy.tv": {
        "_comment": "备用",
        "name": "🎬旺旺短剧",
        "api": "https://wwzy.tv/api.php/provide/vod",
        "detail": "https://wwzy.tv"
      },
      "1080zyk4.com": {
        "name": "🎬优质资源",
        "api": "https://api.yzzy-api.com/inc/apijson.php",
        "detail": "https://1080zyk4.com"
      },
      "91md.me": {
        "name": "🔞麻豆视频",
        "api": "https://91md.me/api.php/provide/vod",
        "detail": "https://91md.me"
      },
      "91jpzyw.com": {
        "name": "🔞91-精品-",
        "api": "https://91jpzyw.com/api.php/provide/vod",
        "detail": "https://91jpzyw.com"
      },
      "lbapiby.com": {
        "name": "🔞--AIvin-",
        "api": "http://lbapiby.com/api.php/provide/vod",
        "detail": "http://lbapiby.com"
      },
      "api.bwzym3u8.com": {
        "name": "🔞百万资源",
        "api": "https://api.bwzyz.com/api.php/provide/vod",
        "detail": "https://api.bwzym3u8.com"
      },
      "api.souavzy.vip": {
        "name": "🔞souavZY",
        "api": "https://api.souavzy.vip/api.php/provide/vod",
        "detail": "https://api.souavzy.vip"
      },
      "155zy2.com": {
        "name": "🔞155-资源",
        "api": "https://155api.com/api.php/provide/vod",
        "detail": "https://155zy2.com"
      },
      "apiyutu.com": {
        "name": "🔞玉兔资源",
        "api": "https://apiyutu.com/api.php/provide/vod",
        "detail": "https://apiyutu.com"
      },
      "fhapi9.com": {
        "name": "🔞番号资源",
        "api": "http://fhapi9.com/api.php/provide/vod",
        "detail": "http://fhapi9.com"
      },
      "www.jingpinx.com": {
        "name": "🔞精品资源",
        "api": "https://www.jingpinx.com/api.php/provide/vod",
        "detail": "https://www.jingpinx.com"
      },
      "apilsbzy1.com": {
        "name": "🔞-老色逼-",
        "api": "https://apilsbzy1.com/api.php/provide/vod",
        "detail": "https://apilsbzy1.com"
      },
      "thzy8.me": {
        "name": "🔞桃花资源",
        "api": "https://thzy1.me/api.php/provide/vod",
        "detail": "https://thzy8.me"
      },
      "www.yyzywcj.com": {
        "name": "🔞优优资源",
        "api": "https://www.yyzywcj.com/api.php/provide/vod",
        "detail": "https://www.yyzywcj.com"
      },
      "xiaojizy.live": {
        "name": "🔞小鸡资源",
        "api": "https://api.xiaojizy.live/provide/vod",
        "detail": "https://xiaojizy.live"
      },
      "hsckzy.xyz": {
        "name": "🔞黄色仓库",
        "api": "https://hsckzy.xyz/api.php/provide/vod",
        "detail": "https://hsckzy.xyz"
      },
      "apidanaizi.com": {
        "name": "🔞-大奶子-",
        "api": "https://apidanaizi.com/api.php/provide/vod",
        "detail": "https://apidanaizi.com"
      },
      "jkunzyapi.com": {
        "name": "🔞jkun资源",
        "api": "https://jkunzyapi.com/api.php/provide/vod",
        "detail": "https://jkunzyapi.com"
      },
      "lbapi9.com": {
        "name": "🔞乐播资源",
        "api": "https://lbapi9.com/api.php/provide/vod",
        "detail": "https://lbapi9.com"
      },
      "Naixxzy.com": {
        "name": "🔞奶香资源",
        "api": "https://Naixxzy.com/api.php/provide/vod",
        "detail": "https://Naixxzy.com"
      },
      "slapibf.com": {
        "name": "🔞森林资源",
        "api": "https://beiyong.slapibf.com/api.php/provide/vod",
        "detail": "https://slapibf.com"
      },
      "apilj.com": {
        "name": "🔞辣椒资源",
        "api": "https://apilj.com/api.php/provide/vod",
        "detail": "https://apilj.com"
      },
      "shayuapi.com": {
        "name": "🔞鲨鱼资源",
        "api": "https://shayuapi.com/api.php/provide/vod",
        "detail": "https://shayuapi.com"
      },
      "xzytv.com": {
        "name": "🔞-幸资源-",
        "api": "https://xzybb2.com/api.php/provide/vod",
        "detail": "https://xzytv.com"
      },
      "doudouzy.com": {
        "name": "🔞豆豆资源",
        "api": "https://api.douapi.cc/api.php/provide/vod",
        "detail": "https://doudouzy.com"
      },
      "didizy.com": {
        "name": "🔞滴滴资源",
        "api": "https://api.ddapi.cc/api.php/provide/vod",
        "detail": "https://didizy.com"
      },
      "heiliaozy.cc": {
        "name": "🔞黑料资源",
        "api": "https://www.heiliaozyapi.com/api.php/provide/vod",
        "detail": "https://heiliaozy.cc"
      },
      "ckzy.me": {
        "name": "🎬CK资源",
        "api": "https://ckzy.me/api.php/provide/vod",
        "detail": "https://ckzy.me"
      },
      "www.msnii.com": {
        "_comment": "JSON 里所有中文字符为 Unicode 编码",
        "name": "🔞-美少女-",
        "api": "https://www.msnii.com/api/json.php",
        "detail": "https://www.msnii.com"
      },
      "www.pgxdy.com": {
        "_comment": "JSON 里所有中文字符为 Unicode 编码",
        "name": "🔞-黄AVZY",
        "api": "https://www.pgxdy.com/api/json.php",
        "detail": "https://www.pgxdy.com"
      },
      "www.kxgav.com": {
        "_comment": "JSON 里所有中文字符为 Unicode 编码",
        "name": "🔞白嫖资源",
        "api": "https://www.kxgav.com/api/json.php",
        "detail": "https://www.kxgav.com"
      },
      "semaozy1.com": {
        "_comment": "JSON 里所有中文字符为 Unicode 编码",
        "name": "🔞色猫资源",
        "api": "https://caiji.semaozy.net/inc/apijson_vod.php/provide/vod",
        "detail": "https://semaozy1.com"
      },
      "www_ikunzy_com": {
        "name": "🎬 iKun资源",
        "api": "https://www.ikunzy.com/api.php/provide/vod/",
        "detail": "https://www.ikunzy.com"
      },
      "cj_lziapi_com": {
        "name": "🎬 量子资源",
        "api": "https://cj.lziapi.com/api.php/provide/vod/",
        "detail": "https://cj.lziapi.com"
      },
      "api_xinlangapi_com": {
        "name": "🎬 新浪资源",
        "api": "https://api.xinlangapi.com/xinlangapi.php/provide/vod/",
        "detail": "https://api.xinlangapi.com"
      },
      "api_wujinapi_com": {
        "name": "🎬 无尽资源",
        "api": "https://api.wujinapi.com/api.php/provide/vod/",
        "detail": "https://api.wujinapi.com"
      },
      "api_wujinapi_me": {
        "name": "🎬 无尽资源2",
        "api": "https://api.wujinapi.me/api.php/provide/vod/",
        "detail": "https://api.wujinapi.me"
      },
      "aqyzy": {
        "name": "🎬爱奇艺",
        "api": "https://iqiyizyapi.com/api.php/provide/vod",
        "detail": "https://iqiyizyapi.com"
      },
      "2k_source": {
        "name": "小苹果无广源",
        "api": "http://121.40.174.45:199/api.php/provide/vod/",
        "detail": "http://121.40.174.45:199/api.php/provide/vod/",
        "is_adult": false
      },
      "adfree_source": {
        "name": "部分无广源",
        "api": "https://yonghu.ffzyapi8.com/api.php/provide/vod/from/ffm3u8/at/json/",
        "detail": "https://yonghu.ffzyapi8.com",
        "is_adult": false
      },
      "jinyingzy.net": {
        "name": "🎬金鹰资源",
        "api": "https://jyzyapi.com/provide/vod/from/jinyingyun/at/json",
        "detail": "https://jinyingzy.net"
      },
      "360zy": {
        "name": "TV-360资源",
        "api": "https://360zy.com/api.php/provide/vod",
        "detail": "https://360zy.com",
        "is_adult": false
      },
      "ukuapi88": {
        "name": "TV-U酷资源88",
        "api": "https://api.ukuapi88.com/api.php/provide/vod",
        "detail": "https://api.ukuapi88.com",
        "is_adult": false
      },
      "ikunzy": {
        "name": "TV-ikun资源",
        "api": "https://ikunzyapi.com/api.php/provide/vod",
        "detail": "https://ikunzyapi.com",
        "is_adult": false
      },
      "guangsuapi": {
        "name": "TV-光速资源",
        "api": "https://api.guangsuapi.com/api.php/provide/vod",
        "detail": "https://api.guangsuapi.com",
        "is_adult": false
      },
      "wolongzyw": {
        "name": "TV-卧龙点播",
        "api": "https://collect.wolongzyw.com/api.php/provide/vod",
        "detail": "https://collect.wolongzyw.com",
        "is_adult": false
      },
      "tyyszy": {
        "name": "TV-天涯资源",
        "api": "https://tyyszy.com/api.php/provide/vod",
        "detail": "https://tyyszy.com",
        "is_adult": false
      },
      "xinlangapi": {
        "name": "TV-新浪点播",
        "api": "https://api.xinlangapi.com/xinlangapi.php/provide/vod",
        "detail": "https://api.xinlangapi.com",
        "is_adult": false
      },
      "zuidazy": {
        "name": "TV-最大点播",
        "api": "http://zuidazy.me/api.php/provide/vod",
        "detail": "http://zuidazy.me",
        "is_adult": false
      },
      "zuidapi": {
        "name": "TV-最大资源",
        "api": "https://api.zuidapi.com/api.php/provide/vod",
        "detail": "https://api.zuidapi.com",
        "is_adult": false
      },
      "dyttzyapi": {
        "name": "TV-电影天堂资源",
        "api": "http://caiji.dyttzyapi.com/api.php/provide/vod",
        "detail": "http://caiji.dyttzyapi.com",
        "is_adult": false
      },
      "1080zyku_json": {
        "name": "TV-神马云",
        "api": "https://api.1080zyku.com/inc/apijson.php/",
        "detail": "https://api.1080zyku.com",
        "is_adult": false
      },
      "hongniuzy2": {
        "name": "TV-红牛资源",
        "api": "https://www.hongniuzy2.com/api.php/provide/vod",
        "detail": "https://www.hongniuzy2.com",
        "is_adult": false
      },
      "maotaizy": {
        "name": "TV-茅台资源",
        "api": "https://caiji.maotaizy.cc/api.php/provide/vod",
        "detail": "https://caiji.maotaizy.cc",
        "is_adult": false
      },
      "dbzy_caiji": {
        "name": "TV-豆瓣资源",
        "api": "https://caiji.dbzy.tv/api.php/provide/vod",
        "detail": "https://caiji.dbzy.tv",
        "is_adult": false
      },
      "dbzy": {
        "name": "TV-豆瓣资源",
        "api": "https://dbzy.tv/api.php/provide/vod",
        "detail": "https://dbzy.tv",
        "is_adult": false
      },
      "jinyingzy": {
        "name": "TV-金鹰点播",
        "api": "https://jinyingzy.com/api.php/provide/vod",
        "detail": "https://jinyingzy.com",
        "is_adult": false
      },
      "jyzyapi": {
        "name": "TV-金鹰资源",
        "api": "https://jyzyapi.com/api.php/provide/vod",
        "detail": "https://jyzyapi.com",
        "is_adult": false
      },
      "ffzyapi": {
        "name": "TV-非凡资源",
        "api": "https://cj.ffzyapi.com/api.php/provide/vod",
        "detail": "https://cj.ffzyapi.com",
        "is_adult": false
      },
      "p2100": {
        "name": "TV-飘零资源",
        "api": "https://p2100.net/api.php/provide/vod",
        "detail": "https://p2100.net",
        "is_adult": false
      },
      "ffzynew": {
        "name": "TV-非凡影视new",
        "api": "https://api.ffzyapi.com/api.php/provide/vod",
        "detail": "http://ffzy5.tv",
        "is_adult": false
      },
      "wolongzyw_com": {
        "name": "TV-卧龙资源",
        "api": "https://wolongzyw.com/api.php/provide/vod",
        "detail": "https://wolongzyw.com",
        "is_adult": false
      },
      "jszyapi": {
        "name": "TV-极速资源",
        "api": "https://jszyapi.com/api.php/provide/vod",
        "detail": "https://jszyapi.com",
        "is_adult": false
      },
      "caijidb": {
        "name": "🎬豆瓣资源",
        "api": "https://caiji.dbzy5.com/api.php/provide/vod",
        "detail": "dbzy.tv"
      },
      "tyyszyapi": {
        "name": "🎬天涯影视",
        "api": "https://tyyszy.com/api.php/provide/vod",
        "detail": "https://tyyszy.com"
      },
      "wolong": {
        "name": "🎬卧龙资源",
        "api": "https://wolongzyw.com/api.php/provide/vod",
        "detail": "https://wolongzyw.com"
      },
      "ikun": {
        "name": "🎬iKun资源",
        "api": "https://ikunzyapi.com/api.php/provide/vod",
        "detail": "https://ikunzy.com"
      },
      "lzi": {
        "name": "🎬量子影视",
        "api": "https://cj.lziapi.com/api.php/provide/vod",
        "detail": "https://lzizy.net"
      },
      "dyttzy": {
        "name": "🎬电影天堂",
        "api": "http://caiji.dyttzyapi.com/api.php/provide/vod",
        "detail": "http://caiji.dyttzyapi.com"
      },
      "1080y": {
        "name": "🎬优质资源",
        "api": "https://api.yzzy-api.com/inc/apijson.php",
        "detail": "https://1080zyk4.com"
      },
      "myzy": {
        "name": "🎬猫眼资源",
        "api": "https://api.maoyanapi.top/api.php/provide/vod",
        "detail": "https://www.maoyanzy.com"
      },
      "lzcaiji": {
        "name": "🎬量子资源",
        "api": "https://cj.lzcaiji.com/api.php/provide/vod",
        "detail": "https://cj.lzcaiji.com"
      },
      "ruyi": {
        "name": "🎬如意资源",
        "api": "https://jjpz.hafrey.dpdns.org/?url=https://cj.rycjapi.com/api.php/provide/vod",
        "detail": "https://www.ryzyw.com"
      },
      "zy360": {
        "name": "🎬360资源",
        "api": "https://360zy.com/api.php/provide/vod",
        "detail": "https://360zy.com"
      },
      "collectwolongzy": {
        "name": "🎬卧龙资源1",
        "api": "https://collect.wolongzyw.com/api.php/provide/vod",
        "detail": "https://collect.wolongzyw.com"
      },
      "jisu": {
        "name": "🎬极速资源",
        "api": "https://jszyapi.com/api.php/provide/vod",
        "detail": "https://jszyapi.com"
      },
      "mdzy": {
        "name": "🎬魔都资源",
        "api": "https://www.mdzyapi.com/api.php/provide/vod",
        "detail": "https://www.moduzy.net"
      },
      "mozhuazy": {
        "name": "🎬魔爪资源",
        "api": "https://jjpz.hafrey.dpdns.org/?url=https://mozhuazy.com/api.php/provide/vod",
        "detail": "https://mozhuazy.com"
      },
      "ffzy1": {
        "name": "🎬非凡资源",
        "api": "https://api.ffzyapi.com/api.php/provide/vod",
        "detail": "https://cj.ffzyapi.com"
      },
      "ffzy": {
        "name": "🎬非凡影视",
        "api": "https://cj.ffzyapi.com/api.php/provide/vod",
        "detail": "https://cj.ffzyapi.com"
      },
      "bfzy": {
        "name": "🎬暴风资源",
        "api": "https://bfzyapi.com/api.php/provide/vod",
        "detail": "https://bfzy.tv"
      },
      "zuid": {
        "name": "🎬最大资源",
        "api": "https://api.zuidapi.com/api.php/provide/vod",
        "detail": "zuida.xyz"
      },
      "yinghua": {
        "name": "🎬樱花资源",
        "api": "https://m3u8.apiyhzy.com/api.php/provide/vod",
        "detail": "https://yhzy.cc"
      },
      "wujin": {
        "name": "🎬无尽资源",
        "api": "https://api.wujinapi.me/api.php/provide/vod",
        "detail": "https://wujinzy.com"
      },
      "wujincom": {
        "name": "🎬无尽资源1",
        "api": "https://api.wujinapi.com/api.php/provide/vod",
        "detail": "https://wujinzy.com"
      },
      "xsd_sdzyapi": {
        "name": "🎬索尼资源",
        "api": "https://suoniapi.com/api.php/provide/vod",
        "detail": "https://suonizy.net"
      },
      "kuaichezy": {
        "name": "🎬快车资源",
        "api": "https://caiji.kuaichezy.org/api.php/provide/vod",
        "detail": "https://kuaichezy.com"
      },
      "shandian": {
        "name": "🎬闪电资源",
        "api": "https://xsd.sdzyapi.com/api.php/provide/vod",
        "detail": "https://shandianzy.com"
      },
      "wwzy": {
        "name": "🎬旺旺短剧",
        "api": "https://wwzy.tv/api.php/provide/vod",
        "detail": "https://wwzy.tv"
      },
      "apiwwzy": {
        "name": "🎬旺旺资源",
        "api": "https://api.wwzy.tv/api.php/provide/vod",
        "detail": "https://api.wwzy.tv"
      },
      "hhzyapi": {
        "name": "🎬豪华资源",
        "api": "https://hhzyapi.com/api.php/provide/vod",
        "detail": "https://www.haohuazy.com"
      },
      "subocaiji": {
        "name": "🎬速播资源",
        "api": "https://subocaiji.com/api.php/provide/vod",
        "detail": "www.subozy.com"
      },
      "xiaomaomi": {
        "name": "🎬小猫咪",
        "api": "https://zy.xmm.hk/api.php/provide/vod",
        "detail": "http://zy.xmm.hk"
      },
      "huyaapi": {
        "name": "🎬虎牙资源",
        "api": "https://www.huyaapi.com/api.php/provide/vod/at/json",
        "detail": "https://www.huyaapi.com"
      },
      "xbzy": {
        "name": "🔞杏吧资源",
        "api": "https://xingba111.com/api.php/provide/vod",
        "detail": "https://xingba111.com"
      },
      "api.sexnguon": {
        "name": "🔞色南国",
        "api": "https://api.sexnguon.com/api.php/provide/vod",
        "detail": "https://api.sexnguon.com"
      }
    }
  }
}