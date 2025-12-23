// collect_apis.js - 自动搜集网络API资源，筛选高质量资源并添加到配置文件
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// === 配置 ===
const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const REPORT_PATH = path.join(__dirname, 'collection_report.md');
const TIMEOUT_MS = 10000;
const MAX_RETRY = 3;
const RETRY_DELAY_MS = 500;
const SEARCH_KEYWORD = '斗罗大陆'; // 用于测试API有效性的关键词

// === 工具函数 ===
const delay = ms => new Promise(r => setTimeout(r, ms));

// 安全GET请求（带重试机制）
const safeGet = async (url) => {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await axios.get(url, { timeout: TIMEOUT_MS });
      return { success: res.status === 200, data: res.data };
    } catch (error) {
      if (attempt < MAX_RETRY) await delay(RETRY_DELAY_MS);
      else return { success: false, error: error.message };
    }
  }
};

// 测试API搜索功能
const testSearch = async (api) => {
  try {
    const url = `${api}?wd=${encodeURIComponent(SEARCH_KEYWORD)}`;
    const res = await axios.get(url, { timeout: TIMEOUT_MS });
    if (res.status !== 200 || !res.data || typeof res.data !== 'object') return false;
    const list = res.data.list || [];
    return list.length > 0;
  } catch {
    return false;
  }
};

// 检查API是否符合高质量标准
const isHighQualityApi = (apiData) => {
  // 检查API数据中是否包含高质量关键词
  const apiString = JSON.stringify(apiData).toLowerCase();
  
  // 检查是否包含需要排除的关键词
  for (const excludeKeyword of EXCLUDE_KEYWORDS) {
    if (apiString.includes(excludeKeyword.toLowerCase())) {
      return false;
    }
  }
  
  // 检查是否包含高质量关键词
  for (const qualityKeyword of QUALITY_KEYWORDS) {
    if (apiString.includes(qualityKeyword.toLowerCase())) {
      return true;
    }
  }
  
  // 如果没有明确的高质量标识，默认认为是高质量
  return true;
};

// 验证API有效性
const validateApi = async (apiUrl) => {
  try {
    // 检查基本连通性
    const connectivity = await safeGet(apiUrl);
    if (!connectivity.success) return false;

    // 检查搜索功能
    const hasSearch = await testSearch(apiUrl);
    if (!hasSearch) return false;
    
    // 检查是否符合高质量标准
    const isHighQuality = isHighQualityApi(connectivity.data);
    return isHighQuality;
  } catch {
    return false;
  }
};

// 计算API的有效性分数
const calculateApiScore = (apiUrl) => {
  let score = 0;
  
  // 1. 基于路径模式的分数
  const commonPaths = API_PATTERNS.slice(0, 5); // 最常见的前5个路径
  for (let i = 0; i < commonPaths.length; i++) {
    if (apiUrl.includes(commonPaths[i])) {
      score += (5 - i) * 10; // 越常见的路径分数越高
      break;
    }
  }
  
  // 2. 基于域名关键词的分数
  const highQualityKeywords = [
    'ikun', 'iqiyi', 'dbzy', 'tyys', 'mtzy', 'wolong', 'dytt',
    'maoyan', 'lz', '360', 'jszy', 'modu', 'ffzy', 'bfzy'
  ];
  
  for (const keyword of highQualityKeywords) {
    if (apiUrl.includes(keyword)) {
      score += 15;
      break;
    }
  }
  
  // 3. 基于域名后缀的分数
  const goodSuffixes = ['com', 'cn', 'net', 'tv'];
  for (const suffix of goodSuffixes) {
    if (apiUrl.endsWith(suffix)) {
      score += 10;
      break;
    }
  }
  
  // 4. 基于域名格式的分数（排除明显无效的格式）
  if (apiUrl.match(/^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/.+$/)) {
    score += 20;
  }
  
  return score;
};

// 生成唯一的主机名键值
const generateUniqueKey = (hostname, existingKeys) => {
  let key = hostname;
  let counter = 1;
  while (existingKeys.has(key)) {
    key = `${hostname}_${counter}`;
    counter++;
  }
  return key;
};

// 从公开API目录获取API列表
const fetchApisFromSources = async () => {
  const apis = [];
  
  // 如果没有配置源，则直接返回空数组
  if (!SOURCES || SOURCES.length === 0) {
    console.log('ℹ️ 未配置API源，跳过从目录获取API');
    return [];
  }
  
  for (const source of SOURCES) {
    try {
      console.log(`📡 正在从 ${source} 获取API列表...`);
      const response = await safeGet(source);
      
      if (response.success && response.data) {
        // 根据不同API目录的返回格式解析API地址
        // 这里需要根据实际的API目录返回格式进行调整
        if (Array.isArray(response.data)) {
          // 如果返回的是数组
          for (const item of response.data) {
            if (item && typeof item === 'object' && item.api) {
              apis.push(item.api);
            } else if (typeof item === 'string' && item.includes('api')) {
              apis.push(item);
            }
          }
        } else if (typeof response.data === 'object') {
          // 如果返回的是对象
          for (const key in response.data) {
            const item = response.data[key];
            if (item && typeof item === 'object' && item.api) {
              apis.push(item.api);
            } else if (typeof item === 'string' && item.includes('api')) {
              apis.push(item);
            }
          }
        }
      } else {
        console.log(`⚠️ 从 ${source} 获取数据失败或无数据返回`);
      }
    } catch (error) {
      console.error(`❌ 从 ${source} 获取API列表失败:`, error.message);
    }
  }
  
  const uniqueApis = [...new Set(apis)]; // 去重
  console.log(`✅ 从API目录获取到 ${uniqueApis.length} 个不重复的API`);
  return uniqueApis;
};

// 生成潜在的API地址
const generatePotentialApis = () => {
  // 常见的实际视频API域名后缀（只保留最常用的）
  const domainSuffixes = [
    'com', 'cn', 'net', 'tv', 'me'
  ];
  
  // 精选的视频API域名关键词（只保留最有可能有效的）
  const domainKeywords = [
    'ikun', 'iqiyi', 'dbzy', 'tyys', 'mtzy', 'wolong', 'dytt',
    'maoyan', 'lz', '360', 'jszy', 'modu', 'ffzy', 'bfzy',
    'zuida', 'wujin', 'xinlang', 'wwzy', 'subo', 'jinying',
    'uku', 'guangsu', 'hongniu', 'ryzy', 'haohua', 'bdzy', 'lzi'
  ];
  
  // 生成更实际的域名组合
  const potentialDomains = [];
  
  // 只生成有效的域名格式（keyword.suffix），移除无效的组合
  for (const keyword of domainKeywords) {
    for (const suffix of domainSuffixes) {
      // 只添加有效的域名格式，移除如 "zycom" 这样的无效格式
      potentialDomains.push(`${keyword}.${suffix}`);
    }
  }
  
  // 只保留最常用的前缀组合
  for (const prefix of ['api', 'cj']) {
    for (const keyword of domainKeywords.slice(0, 15)) { // 只使用前15个关键词
      for (const suffix of domainSuffixes) {
        potentialDomains.push(`${prefix}.${keyword}.${suffix}`);
      }
    }
  }
  
  // 去重
  const uniqueDomains = [...new Set(potentialDomains)];
  
  // 生成潜在的API URL
  const potentialApis = [];
  for (const domain of uniqueDomains) {
    for (const pattern of API_PATTERNS.slice(0, 5)) { // 只使用前5个最常用的API路径
      potentialApis.push(`https://${domain}${pattern}`);
    }
  }
  
  console.log(`🔧 基于现有API模式生成了 ${uniqueDomains.length} 个潜在域名`);
  return potentialApis;
};

// === API搜集源 ===
// 这里定义一些可能包含API资源的网站或目录
// 注意：以下是一些实际可用的API目录源示例
const SOURCES = [
  // 公开的API目录网站（使用实际可用的源）
  // 注意：这些源可能随时变化，请根据实际情况调整
  'https://api.wmdb.tv/api/v1/movie/list',
  'https://api.wmdb.tv/api/v1/tv/list',
  // 可以添加更多实际可用的API目录源
];

// 常见的API路径模式
const API_PATTERNS = [
  '/api.php/provide/vod',
  '/inc/apijson.php',
  '/provide/vod',
  '/api/vod',
  '/vod/api',
  '/api.php/provide/video',
  '/api.php/provide/movie',
  '/inc/api.php',
  '/api/json',
  '/api/json.php'
];

// 高质量API特征关键词
const QUALITY_KEYWORDS = [
  '高清', '蓝光', '4k', '4K', '2k', '2K', '超清', '原画', '无广告', '去广告', '纯净'
];

// 需要排除的API特征关键词
const EXCLUDE_KEYWORDS = [
  '广告', '贴片', '字母', '字幕', '测试', 'test', 'demo'
];

// === 主逻辑 ===
(async () => {
  console.log('🔍 开始搜集网络API资源...');
  
  // 1. 加载现有配置
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ 配置文件不存在:', CONFIG_PATH);
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const existingApis = new Set(); // 用于去重
  const existingKeys = new Set(); // 用于生成唯一键值
  
  // 收集现有API和键值
  for (const [key, site] of Object.entries(config.api_site)) {
    existingApis.add(site.api);
    existingKeys.add(key);
  }
  
  console.log(`📊 当前配置中已有 ${existingApis.size} 个API`);
  
  // 2. 搜集新API
  console.log('=== 第一阶段：搜集潜在API ===');
  
  // 从公开API目录获取API列表
  console.log('📡 正在从公开API目录获取API列表...');
  const apisFromSources = await fetchApisFromSources();
  console.log(`📡 从公开API目录获取到 ${apisFromSources.length} 个API`);
  
  // 从预定义的潜在API列表中搜集
  console.log('🔧 正在生成潜在API地址...');
  const generatedApis = generatePotentialApis();
  console.log(`🔧 生成了 ${generatedApis.length} 个潜在API`);
  
  // 合并所有潜在API
  const potentialApis = [...apisFromSources, ...generatedApis];
  
  // 去重
  const uniquePotentialApis = [...new Set(potentialApis)];
  
  // 设置最大潜在API数量限制
  const MAX_POTENTIAL_APIS = 20; // 根据用户要求，限制最大潜在API数量为20个
  let finalPotentialApis = uniquePotentialApis;
  
  // 优化1：根据API有效性概率排序，优先验证最有可能有效的API
  finalPotentialApis = finalPotentialApis.sort((a, b) => {
    // 计算API的有效性分数
    const scoreA = calculateApiScore(a);
    const scoreB = calculateApiScore(b);
    return scoreB - scoreA; // 降序排列，分数高的优先测试
  });
  
  // 优化2：限制最大API数量
  if (finalPotentialApis.length > MAX_POTENTIAL_APIS) {
    finalPotentialApis = finalPotentialApis.slice(0, MAX_POTENTIAL_APIS);
    console.log(`🔍 总共发现 ${uniquePotentialApis.length} 个不重复的潜在API，已筛选为 ${finalPotentialApis.length} 个进行测试`);
  } else {
    console.log(`🔍 总共发现 ${finalPotentialApis.length} 个不重复的潜在API`);
  }
  
  if (finalPotentialApis.length === 0) {
    console.log('⚠️ 未发现任何潜在API，结束执行');
    return;
  }
  
  console.log(`🔍 发现 ${finalPotentialApis.length} 个潜在API`);
  
  // 3. 验证新API的有效性
  console.log('=== 第二阶段：验证API有效性 ===');
  console.log('🧪 开始验证API有效性...');
  const validApis = [];
  let processedCount = 0;
  const totalApis = finalPotentialApis.length;
  
  for (const api of finalPotentialApis) {
    processedCount++;
    // 显示进度
    if (processedCount % 10 === 0 || processedCount === totalApis) {
      console.log(`📋 进度: ${processedCount}/${totalApis} (${Math.round(processedCount/totalApis*100)}%)`);
    }
    
    // 避免重复
    if (existingApis.has(api)) {
      console.log(`⏭️  跳过已存在的API: ${api}`);
      continue;
    }
    
    console.log(`🧪 测试API: ${api}`);
    const isValid = await validateApi(api);
    
    if (isValid) {
      console.log(`✅ 有效API: ${api}`);
      validApis.push(api);
    } else {
      console.log(`❌ 无效API: ${api}`);
    }
  }
  
  console.log(`✅ 验证完成，发现 ${validApis.length} 个有效API`);
  
  // 4. 添加到配置文件
  console.log('=== 第三阶段：添加有效API到配置文件 ===');
  if (validApis.length > 0) {
    console.log(`💾 将 ${validApis.length} 个新API添加到配置文件...`);
    let addedCount = 0;
    
    for (const api of validApis) {
      try {
        // 从API URL中提取主机名作为键值
        const urlObj = new URL(api);
        const hostname = urlObj.hostname;
        const key = generateUniqueKey(hostname, existingKeys);
        
        // 生成名称（可以根据实际情况调整）
        const name = `🆕 新增资源-${key}`;
        
        // 添加到配置
        config.api_site[key] = {
          name: name,
          api: api,
          detail: `https://${hostname}`
        };
        
        existingKeys.add(key);
        console.log(`➕ 已添加: ${name} (${api})`);
        addedCount++;
      } catch (error) {
        console.error(`❌ 添加API时出错: ${api}`, error.message);
      }
    }
    
    // 5. 保存更新后的配置
    if (addedCount > 0) {
      try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
        console.log('✅ 配置文件已更新');
      } catch (error) {
        console.error('❌ 保存配置文件时出错:', error.message);
        return;
      }
    } else {
      console.log('⚠️ 没有API被成功添加');
    }
  } else {
    console.log('📭 没有发现有效的API');
  }
  
  // 6. 生成报告
  console.log('=== 第四阶段：生成报告 ===');
  const report = `
# API搜集报告

## 概述
- 搜集时间: ${new Date().toLocaleString('zh-CN')}
- 潜在API数量: ${uniquePotentialApis.length}
- 有效API数量: ${validApis.length}
- 新增API数量: ${Object.keys(config.api_site).length - existingApis.size}

## 新增的API列表
${validApis.map(api => `- ${api}`).join('\n') || '无'}

## 说明
此脚本自动搜集网络上的视频API资源，验证其有效性并筛选高质量资源后去重并添加到配置文件中。
  `.trim();
  
  try {
    fs.writeFileSync(REPORT_PATH, report, 'utf-8');
    console.log('📄 搜集报告已生成:', REPORT_PATH);
  } catch (error) {
    console.error('❌ 生成报告时出错:', error.message);
  }
  
  console.log(`🎉 完成！新增了 ${validApis.length} 个API到配置文件中`);
})();
