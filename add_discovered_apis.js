// add_discovered_apis.js - 将发现的API添加到配置文件
const fs = require('fs');
const path = require('path');

// === 配置 ===
const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const DISCOVERED_APIS_PATH = path.join(__dirname, 'discovered_apis.json');

// 生成唯一的主机名键值
const generateUniqueKey = (hostname, existingKeys) => {
  let key = hostname.replace(/\./g, '_'); // 将点号替换为下划线
  let counter = 1;
  while (existingKeys.has(key)) {
    key = `${hostname.replace(/\./g, '_')}_${counter}`;
    counter++;
  }
  return key;
};

// 生成资源名称
const generateName = (hostname) => {
  // 基于主机名生成友好的资源名称
  const nameMap = {
    'www_ikunzy_com': '🎬 iKun资源',
    'cj_lziapi_com': '🎬 量子资源',
    'api_xinlangapi_com': '🎬 新浪资源',
    'api_wujinapi_com': '🎬 无尽资源',
    'api_wujinapi_me': '🎬 无尽资源2',
    'www_hongniuzy2_com': '🎬 红牛资源',
    'www_789pan_com': '🎬 789盘资源'
  };
  
  return nameMap[hostname.replace(/\./g, '_')] || `🎬 新发现资源-${hostname.replace(/\./g, '_')}`;
};

// 主函数
(async () => {
  console.log('📥 开始将发现的API添加到配置文件...');
  
  // 1. 检查发现文件是否存在
  if (!fs.existsSync(DISCOVERED_APIS_PATH)) {
    console.error('❌ 未找到发现的API文件:', DISCOVERED_APIS_PATH);
    console.log('💡 请先运行 npm run simple-discover 来发现API');
    process.exit(1);
  }
  
  // 2. 读取发现的API
  const discoveredData = JSON.parse(fs.readFileSync(DISCOVERED_APIS_PATH, 'utf-8'));
  const discoveredApis = discoveredData.discoveredApis;
  
  if (!discoveredApis || discoveredApis.length === 0) {
    console.log('📭 没有发现的API需要添加');
    process.exit(0);
  }
  
  console.log(`📊 发现了 ${discoveredApis.length} 个API`);
  
  // 3. 加载现有配置
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ 配置文件不存在:', CONFIG_PATH);
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const existingKeys = new Set(); // 用于生成唯一键值
  
  // 收集现有键值
  for (const key of Object.keys(config.api_site)) {
    existingKeys.add(key);
  }
  
  console.log(`📊 当前配置中已有 ${existingKeys.size} 个API`);
  
  // 4. 添加新API到配置
  let addedCount = 0;
  
  for (const apiUrl of discoveredApis) {
    try {
      // 从API URL中提取主机名作为键值
      const urlObj = new URL(apiUrl);
      const hostname = urlObj.hostname;
      const key = generateUniqueKey(hostname, existingKeys);
      
      // 检查是否已存在
      let exists = false;
      for (const [existingKey, site] of Object.entries(config.api_site)) {
        if (site.api === apiUrl) {
          exists = true;
          break;
        }
      }
      
      if (exists) {
        console.log(`⏭️  跳过已存在的API: ${apiUrl}`);
        continue;
      }
      
      // 生成名称
      const name = generateName(hostname);
      
      // 添加到配置
      config.api_site[key] = {
        name: name,
        api: apiUrl,
        detail: `https://${hostname}`
      };
      
      existingKeys.add(key);
      console.log(`➕ 已添加: ${name} (${apiUrl})`);
      addedCount++;
    } catch (error) {
      console.error(`❌ 添加API时出错: ${apiUrl}`, error.message);
    }
  }
  
  // 5. 保存更新后的配置
  if (addedCount > 0) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
      console.log(`✅ 成功添加了 ${addedCount} 个新API到配置文件`);
      console.log('💾 配置文件已更新');
    } catch (error) {
      console.error('❌ 保存配置文件时出错:', error.message);
      process.exit(1);
    }
  } else {
    console.log('⚠️ 没有API被添加到配置文件');
  }
  
  console.log('\n🎉 完成！');
})();