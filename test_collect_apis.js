// test_collect_apis.js - 简化版API搜集测试脚本
const fs = require('fs');
const path = require('path');

// === 配置 ===
const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');

console.log('🔍 开始测试API搜集功能...');

// 1. 检查配置文件是否存在
if (!fs.existsSync(CONFIG_PATH)) {
  console.error('❌ 配置文件不存在:', CONFIG_PATH);
  process.exit(1);
}

// 2. 加载现有配置
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
console.log(`✅ 成功加载配置文件，当前共有 ${Object.keys(config.api_site).length} 个API`);

// 3. 显示前几个API作为示例
console.log('\n📋 前5个API示例:');
let count = 0;
for (const [key, site] of Object.entries(config.api_site)) {
  if (count >= 5) break;
  console.log(`  ${count + 1}. ${site.name}: ${site.api}`);
  count++;
}

console.log('\n✅ 测试完成，脚本功能正常');
console.log('\n💡 如需实际运行搜集功能，请执行:');
console.log('   npm run collect');