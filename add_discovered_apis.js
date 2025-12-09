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
  const discoveredApis = discoveredData.discoveredApis;
  
  if (!discoveredApis || discoveredApis.length === 0) {
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
    // 标准化URL
    const normalizedUrl = apiInfo.api.replace(/\/$/, '');
    
    // 检查是否已存在
    if (existingApis.has(normalizedUrl)) {
      console.log(`⏭️  跳过已存在的API: ${apiInfo.api}`);
      continue;
    }
    
    // 生成唯一键名
    let keyName = apiInfo.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
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
      name: apiInfo.name,
      api: apiInfo.api,
      detail: apiInfo.detail
    };
    
    console.log(`➕ 已添加: ${apiInfo.name}(${apiInfo.api})`);
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