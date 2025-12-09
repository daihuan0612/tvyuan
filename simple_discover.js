// simple_discover.js - 简单可靠的API发现脚本
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const DISCOVERED_APIS_PATH = path.join(__dirname, 'discovered_apis.json');

// 预定义的API列表（用于发现新API）
const PREDEFINED_APIS = [
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

// 搜索关键词测试
const SEARCH_KEYWORDS = ['斗罗大陆', '爱情', '喜剧'];

console.log('🔍 开始简单API发现...');
console.log(`📊 当前配置中已有 ${Object.keys(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')).api_site).length} 个API`);

// 读取现有配置
const existingConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
const existingApis = new Set();

// 收集现有API URL
for (const key in existingConfig.api_site) {
  const apiInfo = existingConfig.api_site[key];
  if (apiInfo.api) {
    // 标准化URL，去掉末尾的斜杠
    const normalizedUrl = apiInfo.api.replace(/\/$/, '');
    existingApis.add(normalizedUrl);
  }
}

console.log(`🔧 准备测试 ${PREDEFINED_APIS.length} 个预定义API`);

// 测试API函数
async function testApi(apiUrl) {
  try {
    // 标准化URL
    const normalizedUrl = apiUrl.replace(/\/$/, '');
    
    // 检查是否已存在
    if (existingApis.has(normalizedUrl)) {
      console.log(`⏭️ 跳过已存在的API: ${apiUrl}`);
      return null;
    }
    
    console.log(`📡 正在测试: ${apiUrl}`);
    
    // 首先测试基础连接
    const response = await axios.get(apiUrl, {
      timeout: 5000,
      validateStatus: function (status) {
        return status < 500; // Accept all status codes except 5xx
      }
    });
    
    // 检查响应内容
    if (response.status >= 400) {
      console.log(`❌ 无效API: ${apiUrl} (${response.status})`);
      return null;
    }
    
    // 检查是否支持搜索功能
    let searchWorking = false;
    for (const keyword of SEARCH_KEYWORDS) {
      try {
        const searchUrl = `${apiUrl}?wd=${encodeURIComponent(keyword)}&limit=1`;
        const searchResponse = await axios.get(searchUrl, {
          timeout: 5000,
          validateStatus: function (status) {
            return status < 500;
          }
        });
        
        // 检查搜索结果是否包含有效数据
        if (searchResponse.status === 200) {
          const data = searchResponse.data;
          if (data && (data.list || data.data || (typeof data === 'object' && Object.keys(data).length > 0))) {
            searchWorking = true;
            break;
          }
        }
      } catch (searchError) {
        // 搜索失败，继续尝试下一个关键词
        continue;
      }
    }
    
    if (!searchWorking) {
      console.log(`❌ API不支持搜索功能: ${apiUrl}`);
      return null;
    }
    
    // 生成API名称
    let apiName = '🎬 新API';
    const domainMatch = apiUrl.match(/https?:\/\/([^\/]+)/);
    if (domainMatch) {
      const domain = domainMatch[1].replace('www.', '').split('.')[0];
      apiName = `🎬 ${domain}资源`;
    }
    
    console.log(`✅ 有效API: ${apiUrl}`);
    return {
      name: apiName,
      api: apiUrl,
      detail: apiUrl.replace('/api.php/provide/vod/', '').replace('/api.php/provide/vod', '')
    };
  } catch (error) {
    console.log(`❌ 无效API: ${apiUrl} (${error.message})`);
    return null;
  }
}

// 主函数
async function main() {
  try {
    const validApis = [];
    
    // 测试所有预定义API
    for (let i = 0; i < PREDEFINED_APIS.length; i++) {
      const apiUrl = PREDEFINED_APIS[i];
      const result = await testApi(apiUrl);
      
      if (result) {
        validApis.push(result);
      }
      
      // 显示进度
      console.log(`📋 进度: ${i + 1}/${PREDEFINED_APIS.length} (${Math.round((i + 1) / PREDEFINED_APIS.length * 100)}%)`);
    }
    
    console.log(`\n✅ 测试完成，发现 ${validApis.length} 个有效API`);
    
    if (validApis.length > 0) {
      // 保存发现的API
      const output = {
        discoveredApis: validApis,
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(DISCOVERED_APIS_PATH, JSON.stringify(output, null, 2), 'utf-8');
      console.log(`💾 已保存发现的API到: ${DISCOVERED_APIS_PATH}`);
      
      // 显示发现的API
      console.log('\n🆕 发现的有效API:');
      validApis.forEach((api, index) => {
        console.log(`${index + 1}. ${api.name}: ${api.api}`);
      });
    } else {
      console.log('📭 未发现新的有效API');
    }
    
    console.log('\n🎉 API发现完成!');
  } catch (error) {
    console.error('❌ 发现过程中出错:', error.message);
    process.exit(1);
  }
}

main();