//  update_readme.js
const fs = require('fs');
const path = require('path');

const reportPath = path.join(__dirname, 'report.md');
const readmePath = path.join(__dirname, 'README.md');
const configPath = path.join(__dirname, 'LunaTV-config.json');  // 添加配置文件路径

// 读取 LunaTV-config.json 来获取实际的API总数
let totalApisInConfig = 0;
if (fs.existsSync(configPath)) {
    try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        totalApisInConfig = Object.keys(config.api_site).length;
    } catch (e) {
        console.error('❌ 解析 LunaTV-config.json 失败:', e.message);
    }
}

// 读取 report.md
if (!fs.existsSync(reportPath)) {
    console.error('❌ report.md 不存在，请先运行 check_api.js');
    process.exit(1);
}

const reportContent = fs.readFileSync(reportPath, 'utf-8');

// 提取 Markdown 表格
const tableStart = reportContent.indexOf('| 状态 |');
const tableEnd = reportContent.indexOf('<details>');
if (tableStart === -1) {
    console.error('❌ report.md 中未找到表格');
    process.exit(1);
}
let tableMd = tableEnd === -1 ? reportContent.substring(tableStart).trim() : reportContent.substring(tableStart, tableEnd).trim();

// 拆分表格行
const lines = tableMd.split('\n');
const rows = lines.slice(2); // 数据部分

// 解析每一行数据，提取可用率
const rowsWithData = rows.map(line => {
    const cols = line.split('|').map(c => c.trim());
    const status = cols[1]; // 状态列
    let apiName = cols[2]; // API名称列
    
    // 1. 清理明显的重复模式，例如"🎬 ikunzy资源  🎬 ikunzy 资源" → "🎬 ikunzy资源"
    const duplicatePattern = /(🎬|🔞)\s*(.+?)\s*(?:\1\s*\2|\s+\1\s*\2)/gi;
    if (duplicatePattern.test(apiName)) {
        // 提取唯一的资源名称部分
        const match = apiName.match(/(🎬|🔞)\s*(.+?)\s*/i);
        if (match && match[2]) {
            apiName = `${match[1]} ${match[2].trim()}`;
        }
    }
    
    // 2. 清理更复杂的重复情况，例如"🎬 金鹰Json 资源  🎬 金鹰 Json 资源"
    const complexDuplicatePattern = /((🎬|🔞)\s*[^\|]+?)\s*\1/gi;
    while (complexDuplicatePattern.test(apiName)) {
        apiName = apiName.replace(complexDuplicatePattern, '$1');
    }
    
    // 3. 特别处理金鹰Json资源的重复情况
    const jinYingPattern = /🎬\s*金鹰\s*Json\s*资源\s*🎬\s*金鹰\s*Json\s*资源/gi;
    if (jinYingPattern.test(apiName)) {
        apiName = apiName.replace(jinYingPattern, '🎬 金鹰Json 资源');
    }
    
    // 2. 清理多余的空格，统一名称格式
    apiName = apiName.replace(/\s+/g, ' ').trim();
    
    // 3. 确保资源名称格式统一，避免重复
    if (!apiName.includes('资源') && !apiName.includes('线')) {
        apiName = `${apiName.trim()} 资源`;
    }
    
    // 4. 处理特殊情况：将"金鹰Json"和"金鹰 Json"统一格式为"金鹰Json 资源"
    apiName = apiName.replace(/\s*Json\s*/i, 'Json ');
    
    // 5. 移除可能的重复"资源"后缀
    apiName = apiName.replace(/(资源)\s*\1/gi, '$1');
    
    // 6. 统一"Json"的大小写
    apiName = apiName.replace(/json/gi, 'Json');
    
    // 7. 清理多余的空格，确保格式美观
    apiName = apiName.replace(/\s+/g, ' ').trim();
    
    // 8. 确保"资源"后缀前有一个空格
    if (apiName.endsWith('资源') && !apiName.endsWith(' 资源')) {
        const lastChar = apiName.charAt(apiName.length - 2);
        if (lastChar !== ' ') {
            apiName = apiName.replace(/资源$/, ' 资源');
        }
    }
    
    // 7. 清理首尾空格
    apiName = apiName.trim();
    
    // 提取纯API地址，去掉[Link]()包装
    const apiLink = cols[4]; // API地址列（带[Link]()包装）
    let apiAddress = apiLink;
    const linkMatch = apiLink.match(/\[Link\]\((.*?)\)/);
    if (linkMatch) {
        apiAddress = linkMatch[1]; // 提取纯链接
    }
    
    const successCount = parseInt(cols[6]) || 0; // 成功次数
    const failCount = parseInt(cols[7]) || 0; // 失败次数
    const availabilityStr = cols[8]; // 可用率列
    
    // 提取可用率数字（去掉%符号）
    const availabilityMatch = availabilityStr.match(/(\d+\.?\d*)%/);
    const availability = availabilityMatch ? parseFloat(availabilityMatch[1]) : 0;
    
    // 提取搜索状态
    const searchStatus = cols[5]; // 搜索功能列
    
    // 提取趋势
    const trend = cols[9]; // 最近7天趋势列
    
    return {
        status: status,
        apiName: apiName,
        apiAddress: apiAddress,
        searchStatus: searchStatus,
        successCount: successCount,
        failCount: failCount,
        availability: availability,
        trend: trend,
        isSuccess: status.includes('✅')
    };
});

// 按照可用率排序（从高到低），可用率相同时按API名称排序
rowsWithData.sort((a, b) => {
    if (Math.abs(b.availability - a.availability) > 0.01) { // 避免浮点数精度问题
        return b.availability - a.availability; // 按可用率降序
    }
    return a.apiName.localeCompare(b.apiName); // 可用率相同时按API名称升序
});

// 生成新的表头，调整列宽提示
const newHeader = [
    '| 状态 | 资源名称                       | API   | 搜索功能 | 成功次数 | 失败 | 成功率 | 最近7天趋势 |',
    '|------|--------------------------------|-------|---------|---------:|------:|-------:|--------------|'
];

// 生成排序后的表格行
const sortedRows = rowsWithData.map(row => {
    // 将API地址显示为"链接"超链接格式
    const apiLink = `[链接](${row.apiAddress})`;
    // 调整列名：将"失败次数"改为"失败"，与新表头保持一致
    return `| ${row.status} | ${row.apiName} | ${apiLink} | ${row.searchStatus} | ${row.successCount} | ${row.failCount} | ${row.availability}% | ${row.trend} |`;
});

// 更新表格
tableMd = [...newHeader, ...sortedRows].join('\n');

// 统计数据 - 使用配置文件中的实际API数量
const totalApis = totalApisInConfig > 0 ? totalApisInConfig : rowsWithData.length;
const successApis = rowsWithData.filter(row => row.isSuccess).length;
const failApis = totalApis - successApis;

// 按可用率区间分类
const perfectApis = rowsWithData.filter(row => row.availability === 100).length;
const highAvailability = rowsWithData.filter(row => row.availability >= 80 && row.availability < 100).length;
const mediumAvailability = rowsWithData.filter(row => row.availability >= 50 && row.availability < 80).length;
const lowAvailability = rowsWithData.filter(row => row.availability < 50).length;

// 计算平均可用率
const averageAvailability = totalApis > 0 ? (rowsWithData.reduce((sum, row) => sum + row.availability, 0) / totalApis).toFixed(1) : 0;

// 获取当前 CST 时间
const now = new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 16) + " CST";

// 生成带统计和时间戳的区块
const tableBlock =
    `## API 状态（最近更新：${now}）\n\n` +
    `- 总 API 数量：${totalApis}\n` +
    `- 成功 API 数量：${successApis}\n` +
    `- 失败 API 数量：${failApis}\n` +
    `- 平均可用率：${averageAvailability}%\n` +
    `- 完美可用率（100%）：${perfectApis} 个\n` +
    `- 高可用率（80%-99%）：${highAvailability} 个\n` +
    `- 中等可用率（50%-79%）：${mediumAvailability} 个\n` +
    `- 低可用率（<50%）：${lowAvailability} 个\n\n` +
    `<div style="font-size: 11px;">\n\n` +
    `<!-- API_TABLE_START -->\n${tableMd}\n<!-- API_TABLE_END -->`;

// 读取 README.md（可能不存在）
let readmeContent = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf-8') : "";

// 确保只保留一个 API 状态表格，先移除所有现有的表格
readmeContent = readmeContent.replace(
    /## API 状态（最近更新：[^\n]+）[\s\S]*?<!-- API_TABLE_END -->/g,
    ''
);

// 然后在合适的位置添加新表格
const apiHealthSectionStart = "# API 健康报告（每日自动检测API状态）";
if (readmeContent.includes(apiHealthSectionStart)) {
    // 在 API 健康报告标题后添加表格
    readmeContent = readmeContent.replace(
        apiHealthSectionStart,
        `${apiHealthSectionStart}\n\n${tableBlock}`
    );
} else {
    // 如果没有找到标题，添加到文件末尾
    readmeContent += `\n\n# API 健康报告（每日自动检测API状态）\n\n${tableBlock}\n`;
}

console.log("✅ README.md 已更新 API 状态表格（按可用率排序）");

// 写回文件
fs.writeFileSync(readmePath, readmeContent, 'utf-8');

// 输出排序结果摘要
console.log(`\n📊 统计摘要：`);
console.log(`- 平均可用率：${averageAvailability}%`);
console.log(`- 完美可用率 API：${perfectApis} 个`);
console.log(`- 高可用率 API：${highAvailability} 个`);
console.log(`- 中等可用率 API：${mediumAvailability} 个`);
console.log(`- 低可用率 API：${lowAvailability} 个`);

// 显示排序后的前10个和后5个API
console.log(`\n🏆 可用率最高的前10个API：`);
rowsWithData.slice(0, 10).forEach((row, index) => {
    console.log(`${index + 1}. ${row.apiName}: ${row.availability}%`);
});

console.log(`\n⚠️ 可用率最低的后5个API：`);
rowsWithData.slice(-5).forEach((row, index) => {
    console.log(`${rowsWithData.length - 4 + index}. ${row.apiName}: ${row.availability}%`);
});
