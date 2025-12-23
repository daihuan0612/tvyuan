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

// 使用当前仓库的配置文件URL，确保能获取到最新的配置数据
const JSON_SOURCES = {
  'jin18': 'https://raw.githubusercontent.com/daihuan0612/tvyuan/main/jin18.json',
  'jingjian': 'https://raw.githubusercontent.com/daihuan0612/tvyuan/main/jingjian.json'
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

// TVBOX/影视仓转换工具核心功能

// API类型常量
const ApiType = {
  MACCMS_XML: 0,
  MACCMS_JSON: 1,
  CSP_SOURCE: 3
}

// 智能检测 API 类型 - 优化性能
function detectApiType(api) {
  // 快速返回默认值，如果api为空或不是字符串
  if (!api || typeof api !== 'string') return ApiType.MACCMS_JSON;
  
  const url = api.toLowerCase();

  // CSP 源（插件源，优先判断）- 最快的判断
  if (url.startsWith('csp_')) return ApiType.CSP_SOURCE;

  // XML 采集接口 - 优化为更快的判断顺序
  if (
    url.includes('.xml') ||
    url.includes('xml.php') ||
    url.includes('provide/vod/at/xml')
  ) {
    return ApiType.MACCMS_XML;
  }

  // JSON 采集接口 - 优化为更快的判断顺序，移除昂贵的正则表达式
  if (
    url.includes('.json') ||
    url.includes('json.php') ||
    url.includes('api.php/provide/vod') ||
    url.includes('provide/vod') ||
    url.includes('api.php') ||
    url.includes('maccms') ||
    url.includes('/api/')
  ) {
    return ApiType.MACCMS_JSON;
  }

  // 默认为JSON类型（苹果CMS最常见）
  return ApiType.MACCMS_JSON;
}

// 生成TVBOX/影视仓配置
function generateTvboxConfig(
  sources,
  liveSources,
  options
) {
  const {
    mode = 'standard',
    filterAdult = false,
    baseUrl = '',
    useSmartProxy = true
  } = options || {};

  // 过滤掉禁用的源和根据需要过滤成人源
  // 注意：实际数据源可能没有disabled和is_adult属性，所以需要提供默认值
  let sourcesToUse = sources.filter((s) => {
    // 修复：放宽站点验证条件，确保至少有name或api字段
    const hasValidName = s.name && typeof s.name === 'string' && s.name.trim() !== '';
    const hasValidApi = s.api && typeof s.api === 'string' && s.api.trim() !== '';
    
    // 只保留有有效名称或API的站点
    if (!hasValidName && !hasValidApi) {
      return false;
    }
    // 不要过滤掉包含错误信息的站点，即使它们被禁用
    if (s.name && s.name.includes('⚠️')) {
      return true;
    }
    // 过滤掉被禁用的普通站点
    return !(s.disabled === true);
  });
  if (filterAdult) {
    sourcesToUse = sourcesToUse.filter((s) => {
      // 不要过滤掉包含错误信息的站点，即使它们是成人站点
      if (s.name && s.name.includes('⚠️')) {
        return true;
      }
      return !(s.is_adult === true);
    });
  }
  
  // 如果过滤后没有站点，添加一个提示站点
  if (sourcesToUse.length === 0) {
    sourcesToUse = [{
      name: '⚠️ 暂无可用站点',
      api: '',
      disabled: true
    }];
  }
  
  // 限制最大站点数量，避免配置过大导致加载缓慢
  sourcesToUse = sourcesToUse.slice(0, 50);

  // 转换视频源为TVBOX格式
    const sites = sourcesToUse.map((s, index) => {
      // 确保site有必要的属性
      const siteKey = s.key || `site_${index}`;
      const siteName = s.name || `未知站点_${index}`;
      let siteApi = s.api || '';
      
      // 确保API地址包含?ac=list参数
      if (siteApi && !siteApi.includes('?')) {
        siteApi += '?ac=list';
      } else if (siteApi && !siteApi.includes('ac=')) {
        siteApi += '&ac=list';
      }
      
      const apiType = detectApiType(siteApi);
      const site = {
        key: siteKey,
        name: siteName,
        type: apiType,
        api: siteApi,
        searchable: 1,
        quickSearch: 1,
        filterable: 1,
        // 添加默认分类列表，与用户示例保持一致
        categories: []
      };

      // 根据API类型设置默认请求头
      if (apiType === ApiType.CSP_SOURCE) {
        site.header = {
          'User-Agent': 'okhttp/3.15',
          Accept: '*/*',
          Connection: 'close'
        };
      } else {
        site.header = {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 11; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          Connection: 'close'
        };
      }

      // 启用智能搜索代理（如果配置）
      if (useSmartProxy && (apiType === ApiType.MACCMS_XML || apiType === ApiType.MACCMS_JSON) && baseUrl) {
        site.original_api = site.api;
        site.api = `${baseUrl}/api/tvbox/search?source=${encodeURIComponent(siteKey)}&filter=${filterAdult ? 'on' : 'off'}&wd=`;
      }

      return site;
    });

  // 转换直播源为TVBOX格式
  const lives = liveSources
    ? liveSources
        .filter((l) => !(l.disabled === true))
        .map((l) => ({
          name: l.name || `未知直播源_${Math.random().toString(36).substr(2, 5)}`,
          type: 0, // 0-m3u格式
          url: l.url || '',
          ua: l.ua || 'Mozilla/5.0 (Linux; Android 11; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Mobile Safari/537.36',
          epg: l.epg || '',
          logo: '',
          group: '直播'
        }))
    : [];

  // 根据模式生成不同的配置
  let tvboxConfig;

  if (mode === 'yingshicang') {
    // 影视仓专用优化配置
    tvboxConfig = {
      // 移除spider jar配置，让TVBox使用默认spider
      sites: sites.map((site) => {
        const optimizedSite = { ...site };

        // 影视仓优化：删除可能冲突的字段（如果存在）
        if ('timeout' in optimizedSite) {
          delete optimizedSite.timeout;
        }
        if ('retry' in optimizedSite) {
          delete optimizedSite.retry;
        }

        // 影视仓稳定配置
        if (optimizedSite.type === ApiType.CSP_SOURCE) {
          optimizedSite.header = {
            'User-Agent': 'okhttp/3.15',
            Accept: '*/*'
          };
        } else {
          optimizedSite.header = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 11; SM-G973F) AppleWebKit/537.36',
            Accept: 'application/json, */*',
            Connection: 'close'
          };
        }

        // 强制启用所有搜索功能
        optimizedSite.searchable = 1;
        optimizedSite.quickSearch = 1;
        optimizedSite.filterable = 1;

        return optimizedSite;
      }),
      lives: lives,
      parses: [
        { name: 'Json并发', type: 2, url: 'Parallel' },
        { name: 'Json轮询', type: 2, url: 'Sequence' },
        {
          name: '默认解析',
          type: 0,
          url: 'https://jx.aidouer.net/?url=',
          ext: {
            flag: ['qq', 'qiyi', 'mgtv', 'youku', 'letv', 'sohu', 'iqiyi'],
            header: { 'User-Agent': 'Mozilla/5.0' }
          }
        }
      ],
      flags: ['youku', 'qq', 'iqiyi', 'qiyi', 'letv', 'sohu', 'tudou', 'pptv', 'mgtv', 'wasu', 'bilibili', 'renrenmi'],
      rules: [
        {
          name: '量子资源',
          hosts: ['vip.lz', 'hd.lz', 'v.cdnlz.com'],
          regex: [
            '#EXT-X-DISCONTINUITY\r?\n\#EXTINF:6.433333,[\\s\\S]*?#EXT-X-DISCONTINUITY',
            '#EXTINF.*?\s+.*?1o.*?\.ts\s+'
          ]
        },
        {
          name: '非凡资源',
          hosts: ['vip.ffzy', 'hd.ffzy', 'v.ffzyapi.com'],
          regex: [
            '#EXT-X-DISCONTINUITY\r?\n\#EXTINF:6.666667,[\\s\\S]*?#EXT-X-DISCONTINUITY',
            '#EXTINF.*?\s+.*?1o.*?\.ts\s+'
          ]
        }
      ],
      wallpaper: 'https://picsum.photos/1920/1080/?blur=1',
      maxHomeVideoContent: '20'
    };
  } else if (mode === 'fast') {
    // 快速模式：优化切换体验
    tvboxConfig = {
      // 移除spider jar配置，让TVBox使用默认spider
      sites: sites.map((site) => {
        const fastSite = { ...site };
        // 移除可能导致卡顿的配置（如果存在）
        if ('timeout' in fastSite) {
          delete fastSite.timeout;
        }
        if ('retry' in fastSite) {
          delete fastSite.retry;
        }

        // 优化请求头，提升响应速度
        if (fastSite.type === ApiType.CSP_SOURCE) {
          fastSite.header = { 'User-Agent': 'okhttp/3.15' };
        } else {
          fastSite.header = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36',
            Connection: 'close'
          };
        }

        return fastSite;
      }),
      lives: lives,
      parses: [
        { name: 'Json并发', type: 2, url: 'Parallel' },
        { name: '极速解析', type: 0, url: 'https://jx.aidouer.net/?url=', ext: { flag: ['all'] } }
      ],
      flags: ['youku', 'qq', 'iqiyi', 'qiyi', 'letv', 'sohu', 'mgtv'],
      wallpaper: '',
      maxHomeVideoContent: '15'
    };
  } else if (mode === 'safe') {
    // 安全模式：仅输出必要字段
    tvboxConfig = {
      // 移除spider jar配置，让TVBox使用默认spider
      sites,
      lives: lives,
      parses: [
        { name: '默认解析', type: 0, url: 'https://jx.aidouer.net/?url=' }
      ]
    };
  } else {
    // 标准模式：完整配置
    tvboxConfig = {
      // 移除spider jar配置，让TVBox使用默认spider
      wallpaper: 'https://picsum.photos/1920/1080/?blur=2',
      sites,
      lives: lives,
      parses: [
        { name: 'Json并发', type: 2, url: 'Parallel' },
        { name: 'Json轮询', type: 2, url: 'Sequence' },
        {
          name: '默认解析',
          type: 0,
          url: 'https://jx.aidouer.net/?url=',
          ext: {
            flag: ['qq', 'qiyi', 'mgtv', 'youku', 'letv', 'sohu', 'xigua', 'cntv'],
            header: { 'User-Agent': 'Mozilla/5.0' }
          }
        }
      ],
      flags: ['youku', 'qq', 'iqiyi', 'qiyi', 'letv', 'sohu', 'tudou', 'pptv', 'mgtv', 'wasu', 'bilibili', 'renrenmi', 'xigua', 'cntv']
    };
  }

  return tvboxConfig;
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

// JSON api 字段前缀替换 - 带循环引用检测
function addOrReplacePrefix(obj, newPrefix, visited = new Set()) {
  if (typeof obj !== 'object' || obj === null) return obj
  
  // 检测循环引用
  if (visited.has(obj)) return obj
  visited.add(obj)
  
  if (Array.isArray(obj)) {
    const result = obj.map(item => addOrReplacePrefix(item, newPrefix, visited))
    visited.delete(obj)
    return result
  }
  
  const newObj = {}
  for (const key in obj) {
    if (key === 'api' && typeof obj[key] === 'string') {
      let apiUrl = obj[key]
      // 直接添加前缀，不要删除已有内容
      if (!apiUrl.startsWith(newPrefix)) {
        newObj[key] = newPrefix + apiUrl
      } else {
        // 已经有前缀了，直接使用
        newObj[key] = apiUrl
      }
    } else {
      newObj[key] = addOrReplacePrefix(obj[key], newPrefix, visited)
    }
  }
  
  visited.delete(obj)
  return newObj
}

// ---------- 全局内存缓存 ----------
// 简单的内存缓存，减少重复请求
const MEMORY_CACHE = new Map();
const CACHE_TTL = 300000; // 5分钟缓存

// ---------- 安全版：KV 缓存 ----------
async function getCachedJSON(url) {
  // 确保url是字符串，防止后续操作出错
  const originalUrl = url || '';
  let cleanUrl = '';
  
  try {
    // 移除URL中的反引号，防止URL格式错误
    cleanUrl = originalUrl.replace(/[`]/g, '').trim();
    
    // 检查内存缓存
    const cached = MEMORY_CACHE.get(cleanUrl);
    const now = Date.now();
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      console.log('Using cached data for:', cleanUrl);
      return cached.data;
    }
    
    // 设置3秒超时，优化用户体验
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // 直接从网络获取数据，使用配置的URL
    const response = await fetch(cleanUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${cleanUrl}: ${response.status}`);
    }
    
    // 解析获取到的JSON数据
    const data = await response.json();
    
    // 存入内存缓存
    MEMORY_CACHE.set(cleanUrl, {
      data: data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    console.error('Error fetching JSON:', error);
    
    // 如果获取失败，检查是否有过期缓存可以使用
    const cached = MEMORY_CACHE.get(cleanUrl);
    if (cached) {
      console.log('Using stale cache for:', cleanUrl);
      return cached.data;
    }
    // 否则返回包含错误信息的配置，而不是空配置
    console.error(`Failed to fetch ${cleanUrl}, returning default error config`);
    return {
      "cache_time": 7200,
      "api_site": {
        "error_source": {
          "name": "⚠️ 配置源获取失败",
          "api": "",
          "disabled": true,
          "is_adult": false,
          "_comment": `无法获取配置源: ${cleanUrl}`
        }
      }
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
  const tvboxParam = reqUrl.searchParams.get('tvbox')
  
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
  
  // TVBOX 配置输出处理
  if (tvboxParam !== null) {
    return handleTvboxRequest(tvboxParam, sourceParam, prefixParam, defaultPrefix)
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
  // 🚨 防止递归调用自身 - 只检查直接递归，允许代理请求
  const parsedTarget = new URL(targetUrlParam);
  if (parsedTarget.origin === currentOrigin) {
    // 如果是相同origin，检查是否已经包含代理参数，避免无限递归
    const nestedUrl = parsedTarget.searchParams.get('url');
    if (nestedUrl) {
      // 已经包含代理参数，直接代理到嵌套的URL
      return handleProxyRequest(request, nestedUrl, currentOrigin);
    }
    return errorResponse('Loop detected: self-fetch blocked', { url: targetUrlParam }, 400);
  }
  
  // 🚨 防止无效 URL
  if (!/^https?:\/\//i.test(targetUrlParam)) {
    return errorResponse('Invalid target URL', { url: targetUrlParam }, 400)
  }
  
  let fullTargetUrl = targetUrlParam
  
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
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 缩短代理请求超时到5秒
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
    
    const selectedSource = JSON_SOURCES[sourceParam] || JSON_SOURCES['jingjian']
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

// ---------- TVBOX 配置输出处理子模块 ----------
async function handleTvboxRequest(tvboxParam, sourceParam, prefixParam, defaultPrefix) {
  try {
    // 解析 tvbox 参数，格式：mode:proxy:base58，例如：standard:true:false
    const [mode = 'standard', proxyStr = 'false', base58Str = 'false'] = tvboxParam.split(':')
    const proxy = proxyStr === 'true'
    const base58 = base58Str === 'true'
    
    const selectedSource = JSON_SOURCES[sourceParam] || JSON_SOURCES['jingjian']
    console.log('Fetching TVBOX data from:', selectedSource)
    
    const data = await getCachedJSON(selectedSource)
    
    // 从数据源中提取视频源列表 - 更健壮的处理
    let apiSites = []
    if (data && data.api_site) {
      const sources = data.api_site
      apiSites = Array.isArray(sources) ? sources : Object.values(sources)
      console.log('Found', apiSites.length, 'API sites from source')
    } else {
      console.error('No api_site found in data:', JSON.stringify(data))
      // 添加错误信息站点
      apiSites = [{
        name: '⚠️ 配置源获取失败',
        api: '',
        disabled: true,
        is_adult: false,
        _comment: `无法获取配置源: ${selectedSource}`
      }]
    }
    
    // 生成 TVBOX 配置
    let tvboxConfig = generateTvboxConfig(apiSites, [], { mode })
    
    // 如果需要代理，替换 API 前缀
    if (proxy) {
      tvboxConfig = addOrReplacePrefix(tvboxConfig, prefixParam || defaultPrefix)
    }
    
    if (base58) {
      const encoded = base58Encode(tvboxConfig)
      return new Response(encoded, {
        headers: { 'Content-Type': 'text/plain;charset=UTF-8', ...CORS_HEADERS },
      })
    } else {
      return new Response(JSON.stringify(tvboxConfig), {
        headers: { 'Content-Type': 'application/json;charset=UTF-8', ...CORS_HEADERS },
      })
    }
  } catch (err) {
    await logError('tvbox', { message: err.message, stack: err.stack })
    // 返回包含错误信息的TVBOX配置，而不是JSON错误
    const errorTvboxConfig = {
      wallpaper: 'https://picsum.photos/1920/1080/?blur=2',
      sites: [{
        name: '⚠️ 生成配置失败',
        api: '',
        disabled: true,
        is_adult: false,
        _comment: err.message
      }],
      lives: [],
      parses: [
        { name: 'Json并发', type: 2, url: 'Parallel' },
        { name: 'Json轮询', type: 2, url: 'Sequence' },
        {
          name: '默认解析',
          type: 0,
          url: 'https://jx.aidouer.net/?url=',
          ext: {
            flag: ['qq', 'qiyi', 'mgtv', 'youku', 'letv', 'sohu', 'xigua', 'cntv'],
            header: { 'User-Agent': 'Mozilla/5.0' }
          }
        }
      ],
      flags: ['youku', 'qq', 'iqiyi', 'qiyi', 'letv', 'sohu', 'tudou', 'pptv', 'mgtv', 'wasu', 'bilibili', 'renrenmi', 'xigua', 'cntv']
    }
    return new Response(JSON.stringify(errorTvboxConfig), {
      headers: { 'Content-Type': 'application/json;charset=UTF-8', ...CORS_HEADERS },
    })
  }
}

// ---------- 首页文档处理 ----------
async function handleHomePage(currentOrigin, defaultPrefix) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API自动搜集中转代理服务</title>
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
    
    h1 .subtitle {
      font-size: 1.5rem; /* 比h1小两号 */
      opacity: 0.8; /* 可选：添加透明度，让主标题更突出 */
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
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    /* 订阅链接网格布局 */
    .subscription-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin-top: 12px;
    }
    
    .subscription-item {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      border-left: 4px solid var(--primary-color);
      transition: all 0.2s ease;
    }
    
    .subscription-item:hover {
      background: #e9ecef;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .subscription-item.tvbox-item {
      border-left-color: #ff6b6b;
      background: #fff5f5;
    }
    
    .subscription-item.tvbox-item:hover {
      background: #ffebee;
    }
    
    .subscription-item strong {
      display: block;
      margin-bottom: 8px;
      color: var(--text-primary);
      font-size: 0.9rem;
    }
    
    .subscription-item code {
      display: block;
      margin-bottom: 8px;
      word-break: break-all;
      background: white;
      padding: 8px;
      border-radius: 4px;
      font-size: 0.85rem;
      border: 1px solid #dee2e6;
    }
    
    .subscription-item .btn {
      margin-top: 4px;
      font-size: 0.8rem;
      padding: 6px 12px;
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
      <h1>小苹果TV<br><span class="subtitle">API自动搜集中转代理服务</span></h1>
      <p>API自动搜集中转代理服务，用于访问被墙或限制的接口</p>
    </header>
    
    <!-- 登录表单 -->
    <div id="login-container" class="card">
      <h2>🔐 请输入密码</h2>
      <div style="max-width: 400px; margin: 0 auto;">
        <div style="margin-bottom: 16px;">
          <label for="password" style="display: block; margin-bottom: 8px; font-weight: bold;">密码：</label>
          <input type="password" id="password" placeholder="请输入访问密码" style="width: 100%; padding: 12px; font-size: 16px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box;">
        </div>
        <button id="login-btn" class="btn" style="width: 100%; padding: 12px; font-size: 16px;">登录</button>
        <p id="login-error" style="color: #dc3545; margin-top: 12px; text-align: center; display: none;">密码错误，请重试</p>
      </div>
    </div>
    
    <!-- 订阅链接区域，初始隐藏 -->
    <div id="subscription-container" style="display: none;">
      <h2>📋 订阅链接</h2>
      
      <div class="grid">
        <div class="card">
          <h3>📱 精简版</h3>
          <div class="subscription-grid">
            <div class="subscription-item">
              <strong>原始 Base58订阅：</strong><br>
              <code class="copyable">${currentOrigin}?format=2&source=jin18</code>
              <button class="btn btn-copy copy-btn" data-idx="0">复制</button>
            </div>
            <div class="subscription-item">
              <strong>中转 Base58订阅：</strong><br>
              <code class="copyable">${currentOrigin}?format=3&source=jin18</code>
              <button class="btn btn-copy copy-btn" data-idx="1">复制</button>
            </div>
            <div class="subscription-item tvbox-item">
              <strong>TVBox原始订阅：</strong><br>
              <code class="copyable">${currentOrigin}?tvbox=standard:false:false&source=jin18</code>
              <button class="btn btn-copy copy-btn" data-idx="2">复制</button>
            </div>

          </div>
        </div>
        
        <div class="card">
          <h3>📺 完整版</h3>
          <div class="subscription-grid">
            <div class="subscription-item">
              <strong>原始 Base58订阅：</strong><br>
              <code class="copyable">${currentOrigin}?format=2&source=jingjian</code>
              <button class="btn btn-copy copy-btn" data-idx="3">复制</button>
            </div>
            <div class="subscription-item">
              <strong>中转 Base58订阅：</strong><br>
              <code class="copyable">${currentOrigin}?format=3&source=jingjian</code>
              <button class="btn btn-copy copy-btn" data-idx="4">复制</button>
            </div>
            <div class="subscription-item tvbox-item">
              <strong>TVBox原始订阅：</strong><br>
              <code class="copyable">${currentOrigin}?tvbox=standard:false:false&source=jingjian</code>
              <button class="btn btn-copy copy-btn" data-idx="5">复制</button>
            </div>

          </div>
        </div>
      </div>
    </div>
    
  </div>
  
  <div id="notification" class="notification">已复制到剪贴板！</div>
  
  <script>
    // 密码配置 - 请自行修改此密码
    const CORRECT_PASSWORD = '121314';
    
    // 登录功能
    document.getElementById('login-btn').addEventListener('click', () => {
      const passwordInput = document.getElementById('password');
      const loginError = document.getElementById('login-error');
      const loginContainer = document.getElementById('login-container');
      const subscriptionContainer = document.getElementById('subscription-container');
      
      if (passwordInput.value === CORRECT_PASSWORD) {
        // 密码正确，显示订阅链接
        loginContainer.style.display = 'none';
        subscriptionContainer.style.display = 'block';
        loginError.style.display = 'none';
      } else {
        // 密码错误，显示错误信息
        loginError.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
      }
    });
    
    // 回车键登录
    document.getElementById('password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('login-btn').click();
      }
    });
    
    // 复制功能
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
