// add_discovered_apis.js - 将发现的API添加到配置文件
const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const DISCOVERED_APIS_PATH = path.join(__dirname, 'discovered_apis.json');

console.log('📥 开始将发现的API添加到配置文件...');

try {
  // 检查发现的API文件是否存在
  if (!fs.existsSync(DISCOVERED_APIS_PATH)) {
    console.log('❌ 未找到发现的API文件');
    process.exit(1);
  }
  
  // 读取发现的API
  const discoveredData = JSON.parse(fs.readFileSync(DISCOVERED_APIS_PATH, 'utf8'));
  let discoveredApis = discoveredData.discoveredApis;
  
  // 处理不同格式的API数据
  if (Array.isArray(discoveredApis)) {
    // 如果是字符串数组，转换为对象数组
    if (discoveredApis.length > 0 && typeof discoveredApis[0] === 'string') {
      console.log('🔄 转换API格式...');
      discoveredApis = discoveredApis.map(apiUrl => {
        // 生成API名称
        let apiName = '🎬 新API';
        const domainMatch = apiUrl.match(/https?:\/\/([^\/]+)/);
        if (domainMatch) {
          const domain = domainMatch[1].replace('www.', '').split('.')[0];
          apiName = `🎬 ${domain}资源`;
        }
        
        return {
          name: apiName,
          api: apiUrl,
          detail: apiUrl.replace('/api.php/provide/vod/', '').replace('/api.php/provide/vod', '')
        };
      });
    }
    // 如果已经是对象数组，则直接使用
  } else {
    console.log('📭 没有发现的API需要添加');
    process.exit(0);
  }
  
  if (discoveredApis.length === 0) {
    console.log('📭 没有发现的API需要添加');
    process.exit(0);
  }
  
  console.log(`📊 发现了 ${discoveredApis.length} 个API`);
  
  // 读取现有配置
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const existingApis = new Set();
  
  // 收集现有API URL，用于去重
  for (const key in config.api_site) {
    const apiInfo = config.api_site[key];
    if (apiInfo.api) {
      // 标准化URL，去掉末尾的斜杠
      const normalizedUrl = apiInfo.api.replace(/\/$/, '');
      existingApis.add(normalizedUrl);
    }
  }
  
  console.log(`📊 当前配置中已有 ${Object.keys(config.api_site).length} 个API`);
  
  let addedCount = 0;
  
  // 添加新API
  for (const apiInfo of discoveredApis) {
    // 检查必要属性
    if (!apiInfo.api) {
      console.log(`⏭️  跳过无效API条目: ${JSON.stringify(apiInfo)}`);
      continue;
    }
    
    // 标准化URL
    const normalizedUrl = apiInfo.api.replace(/\/$/, '');
    
    // 检查是否已存在
    if (existingApis.has(normalizedUrl)) {
      console.log(`⏭️  跳过已存在的API: ${apiInfo.api}`);
      continue;
    }
    
    // 生成唯一键名
    let keyName = (apiInfo.name || '🎬 新API').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
    if (!keyName) keyName = 'new_api';
    
    if (config.api_site[keyName]) {
      // 如果键名已存在，添加数字后缀
      let counter = 1;
      while (config.api_site[`${keyName}_${counter}`]) {
        counter++;
      }
      keyName = `${keyName}_${counter}`;
    }
    
    // 添加到配置中
    config.api_site[keyName] = {
      name: apiInfo.name || '🎬 新API',
      api: apiInfo.api,
      detail: apiInfo.detail || apiInfo.api.replace('/api.php/provide/vod/', '').replace('/api.php/provide/vod', '')
    };
    
    console.log(`➕ 已添加: ${config.api_site[keyName].name}(${apiInfo.api})`);
    addedCount++;
  }
  
  if (addedCount > 0) {
    // 保存更新后的配置
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log(`✅ 成功添加了 ${addedCount} 个新API到配置文件`);
  } else {
    console.log('⚠️ 没有API被添加到配置文件');
  }
  
  console.log('🎉 完成！');
  
} catch (error) {
  console.error('❌ 添加API时出错:', error.message);
  process.exit(1);
}