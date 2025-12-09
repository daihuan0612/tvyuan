// auto_discover_and_add.js - 自动发现并添加API的完整工作流
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// === 配置 ===
const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const DISCOVERED_APIS_PATH = path.join(__dirname, 'discovered_apis.json');

console.log('🚀 开始自动发现并添加API工作流...');

try {
  // 1. 运行API发现脚本
  console.log('\n=== 第一步：发现新的API ===');
  execSync('node simple_discover.js', { stdio: 'inherit' });
  
  // 2. 检查是否发现了API
  if (!fs.existsSync(DISCOVERED_APIS_PATH)) {
    console.log('❌ 未生成发现的API文件');
    process.exit(1);
  }
  
  const discoveredData = JSON.parse(fs.readFileSync(DISCOVERED_APIS_PATH, 'utf-8'));
  const discoveredApis = discoveredData.discoveredApis;
  
  if (!discoveredApis || discoveredApis.length === 0) {
    console.log('📭 没有发现新的API');
    process.exit(0);
  }
  
  console.log(`✅ 发现了 ${discoveredApis.length} 个新API`);
  
  // 3. 运行添加API脚本
  console.log('\n=== 第二步：将发现的API添加到配置文件 ===');
  execSync('node add_discovered_apis.js', { stdio: 'inherit' });
  
  // 4. 重新生成相关文件
  console.log('\n=== 第三步：重新生成相关文件 ===');
  
  // 生成 jingjian.json 和 jin18.json
  console.log('🔧 生成 JSON 文件...');
  execSync('node generate_json_files.js', { stdio: 'inherit' });
  
  // Base58 编码
  console.log('🔧 执行 Base58 编码...');
  execSync('node encode.js', { stdio: 'inherit' });
  
  // 5. 运行API检查
  console.log('\n=== 第四步：运行API检查 ===');
  execSync('node check_api.js "斗罗大陆"', { stdio: 'inherit' });
  
  // 6. 更新README
  console.log('\n=== 第五步：更新README ===');
  execSync('node update_readme.js', { stdio: 'inherit' });
  
  console.log('\n🎉 完整工作流执行完成！');
  console.log(`✨ 成功添加了 ${discoveredApis.length} 个新API到配置文件`);
  console.log('📁 相关文件已重新生成并更新');
  
} catch (error) {
  console.error('❌ 工作流执行出错:', error.message);
  process.exit(1);
}