// simple_discover.js - 简单可靠的API发现脚本
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// === 配置 ===
const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const DISCOVERED_APIS_PATH = path.join(__dirname, 'discovered_apis.json');
const TIMEOUT_MS = 5000; // 5秒超时

// 基于现有API提取的真实域名和路径模式
const REAL_APIS = [
  'https://api.wmdb.tv/api/v1/movie/list',
  'https://api.wmdb.tv/api/v1/tv/list',
  'https://v.jialiangwei.com/api.php/provide/vod/',
  'https://www.ikunzy.com/api.php/provide/vod/',
  'https://cj.lziapi.com/api.php/provide/vod/',
  'https://api.xinlangapi.com/xinlangapi.php/provide/vod/',
  'https://www.hongniuzy2.com/api.php/provide/vod/',
  'https://www.789pan.com/api.php/provide/vod/',
  'https://api.wujinapi.com/api.php/provide/vod/',
  'https://api.wujinapi.me/api.php/provide/vod/'
];

// 安全GET请求
const safeGet = async (url) => {
  try {
    console.log(`📡 正在测试: ${url}`);
    const response = await axios.get(url, { 
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // 检查是否是有效的视频API响应
    if (response.status === 200) {
      const data = response.data;
      // 检查数据格式是否符合视频API标准
      if (data && typeof data === 'object' && 
          (data.hasOwnProperty('code') || data.hasOwnProperty('list'))) {
        console.log(`✅ 有效API: ${url}`);
        return { success: true, url: url, data: data };
      }
    }
    
    console.log(`❌ 无效API: ${url}`);
    return { success: false, url: url };
  } catch (error) {
    console.log(`❌ 无效API: ${url} (${error.message})`);
    return { success: false, url: url, error: error.message };
  }
};

// 主函数
(async () => {
  console.log('🔍 开始简单API发现...');
  
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
  
  // 2. 测试预定义的API列表
  console.log(`🔧 准备测试 ${REAL_APIS.length} 个预定义API`);
  
  const validApis = [];
  
  // 逐个测试API
  for (let i = 0; i < REAL_APIS.length; i++) {
    const apiUrl = REAL_APIS[i];
    
    // 跳过已存在的API
    if (existingApis.has(apiUrl)) {
      console.log(`⏭️ 跳过已存在的API: ${apiUrl}`);
      continue;
    }
    
    const result = await safeGet(apiUrl);
    if (result.success) {
      validApis.push(apiUrl);
    }
    
    // 显示进度
    console.log(`📋 进度: ${i + 1}/${REAL_APIS.length} (${Math.round((i + 1)/REAL_APIS.length*100)}%)`);
  }
  
  console.log(`\n✅ 测试完成，发现 ${validApis.length} 个有效API`);
  
  // 3. 保存发现的API
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
  
  console.log('\n🎉 API发现完成!');
})();