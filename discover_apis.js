// discover_apis.js - 智能发现实际可用的API源
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// === 配置 ===
const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const DISCOVERED_APIS_PATH = path.join(__dirname, 'discovered_apis.json');
const TIMEOUT_MS = 5000; // 5秒超时
const MAX_CONCURRENT = 5; // 最大并发数

// 基于现有API提取的真实域名和路径模式
const REAL_DOMAINS = [
  'iqiyizyapi.com', 'dbzy.tv', 'tyyszy.com', 'mtzy.me', 'wolongzyw.com',
  'ikunzy.com', 'dyttzyapi.com', 'www.maoyanzy.com', 'cj.lzcaiji.com',
  '360zy.com', 'jszyapi.com', 'www.moduzy.net', 'ffzyapi.com',
  'bfzy.tv', 'zuida.xyz', 'wujinzy.me', 'xinlangapi.com', 'api.wwzy.tv',
  'www.subozy.com', 'jinyingzy.com', 'p2100.net', 'api.ukuapi88.com',
  'api.guangsuapi.com', 'www.hongniuzy.com', 'caiji.moduapi.cc'
];

const API_PATHS = [
  '/api.php/provide/vod',
  '/inc/apijson.php',
  '/provide/vod'
];

// 安全GET请求
const safeGet = async (url) => {
  try {
    const response = await axios.get(url, { 
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    return { 
      success: response.status === 200, 
      data: response.data,
      url: url
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      url: url
    };
  }
};

// 测试API是否有效
const testApiValidity = async (apiUrl) => {
  try {
    // 测试基本连通性
    const response = await safeGet(apiUrl);
    if (!response.success) return false;
    
    // 检查返回数据是否符合视频API格式
    const data = response.data;
    if (!data || typeof data !== 'object') return false;
    
    // 检查是否包含必要的字段
    if (data.hasOwnProperty('code') && data.hasOwnProperty('msg')) {
      // 可能是API响应格式
      return true;
    }
    
    // 检查是否有list字段（视频列表）
    if (data.hasOwnProperty('list') && Array.isArray(data.list)) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
};

// 发现新API
const discoverNewApis = async () => {
  console.log('🔍 开始智能发现API源...');
  
  // 1. 加载现有配置
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ 配置文件不存在:', CONFIG_PATH);
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const existingApis = new Set();
  
  // 收集现有API
  for (const [key, site] of Object.entries(config.api_site)) {
    existingApis.add(site.api);
  }
  
  console.log(`📊 当前配置中已有 ${existingApis.size} 个API`);
  
  // 2. 生成待测试的API列表
  const testUrls = [];
  
  // 基于真实域名和路径生成测试URL
  for (const domain of REAL_DOMAINS) {
    for (const path of API_PATHS) {
      const url = `https://${domain}${path}`;
      if (!existingApis.has(url)) {
        testUrls.push(url);
      }
    }
  }
  
  console.log(`🔧 生成了 ${testUrls.length} 个待测试API`);
  
  // 3. 并发测试API有效性
  console.log('🧪 开始测试API有效性...');
  const validApis = [];
  
  // 控制并发数
  for (let i = 0; i < testUrls.length; i += MAX_CONCURRENT) {
    const batch = testUrls.slice(i, i + MAX_CONCURRENT);
    const promises = batch.map(url => testApiValidity(url));
    const results = await Promise.all(promises);
    
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const url = batch[j]; // 获取对应的URL
      if (result && result.success) {
        console.log(`✅ 有效API: ${url}`);
        validApis.push(url);
      } else {
        console.log(`❌ 无效API: ${url}`);
      }
    }
    
    // 显示进度
    const progress = Math.min(i + MAX_CONCURRENT, testUrls.length);
    console.log(`📋 进度: ${progress}/${testUrls.length} (${Math.round(progress/testUrls.length*100)}%)`);
  }
  
  console.log(`✅ 测试完成，发现 ${validApis.length} 个有效API`);
  
  // 4. 保存发现的API
  if (validApis.length > 0) {
    const discoveryResult = {
      timestamp: new Date().toISOString(),
      discoveredApis: validApis,
      count: validApis.length
    };
    
    fs.writeFileSync(DISCOVERED_APIS_PATH, JSON.stringify(discoveryResult, null, 2), 'utf-8');
    console.log('💾 已保存发现的API到:', DISCOVERED_APIS_PATH);
    
    // 显示发现的API
    console.log('\n🆕 发现的有效API:');
    validApis.forEach((api, index) => {
      console.log(`  ${index + 1}. ${api}`);
    });
  } else {
    console.log('📭 未发现新的有效API');
  }
  
  return validApis;
};

// 主函数
(async () => {
  try {
    await discoverNewApis();
    console.log('\n🎉 API发现完成!');
  } catch (error) {
    console.error('❌ 发现出错:', error.message);
  }
})();