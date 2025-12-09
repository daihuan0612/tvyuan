// generate_json_files.js - 生成精简版和无成人内容版的JSON文件
const fs = require('fs');
const path = require('path');

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const JINGJIAN_PATH = path.join(__dirname, 'jingjian.json');
const JIN18_PATH = path.join(__dirname, 'jin18.json');

try {
  // 读取主配置文件
  const configData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  
  // 生成 jingjian.json (去除带_comment的项)
  console.log('🔧 生成 jingjian.json...');
  const jingjianData = {
    cache_time: configData.cache_time,
    api_site: {}
  };
  
  for (const [key, site] of Object.entries(configData.api_site)) {
    // 排除带有_comment属性的项
    if (!site._comment) {
      jingjianData.api_site[key] = site;
    }
  }
  
  fs.writeFileSync(JINGJIAN_PATH, JSON.stringify(jingjianData, null, 2), 'utf8');
  console.log('✅ jingjian.json 生成完成');
  
  // 生成 jin18.json (去除成人内容)
  console.log('🔧 生成 jin18.json...');
  const jin18Data = {
    cache_time: jingjianData.cache_time,
    api_site: {}
  };
  
  for (const [key, site] of Object.entries(jingjianData.api_site)) {
    // 排除名称以"🔞"开头的项
    if (!site.name.startsWith('🔞')) {
      jin18Data.api_site[key] = site;
    }
  }
  
  fs.writeFileSync(JIN18_PATH, JSON.stringify(jin18Data, null, 2), 'utf8');
  console.log('✅ jin18.json 生成完成');
  
  console.log('🎉 JSON文件生成完成！');
} catch (error) {
  console.error('❌ 生成JSON文件时出错:', error.message);
  process.exit(1);
}