const config = require('./LunaTV-config.json');

// 统计api_site中的API数量
const apiCount = Object.keys(config.api_site).length;

console.log(`LunaTV-config.json 中的API总数: ${apiCount}`);

// 也可以列出所有API名称
console.log('\n所有API名称:');
Object.entries(config.api_site).forEach(([key, value]) => {
    console.log(`- ${key}: ${value.name}`);
});