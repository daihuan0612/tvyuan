// clean_unsearchable_apis.js - 清理无法搜索的API，保留可搜索的API
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// === 配置 ===
const CONFIG_PATH = path.join(__dirname, 'LunaTV-config.json');
const REPORT_PATH = path.join(__dirname, 'report.md');
const SEARCH_KEYWORD = '斗罗大陆'; // 用于测试API搜索功能的关键词
const TIMEOUT_MS = 10000; // 请求超时时间
const MAX_RETRY = 3; // 最大重试次数
const RETRY_DELAY_MS = 500; // 重试间隔

// === 工具函数 ===
const delay = ms => new Promise(r => setTimeout(r, ms));

// 安全的GET请求，带重试机制
const safeGet = async (url) => {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await axios.get(url, { timeout: TIMEOUT_MS });
      return res.status === 200;
    } catch {
      if (attempt < MAX_RETRY) await delay(RETRY_DELAY_MS);
      else return false;
    }
  }
};

// 测试API的搜索功能
const testSearch = async (api, keyword) => {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const url = `${api}?wd=${encodeURIComponent(keyword)}`;
      const res = await axios.get(url, { timeout: TIMEOUT_MS });
      if (res.status !== 200 || !res.data || typeof res.data !== "object") return "❌";
      const list = res.data.list || [];
      if (!list.length) return "无结果";
      return list.some(item => JSON.stringify(item).includes(keyword)) ? "✅" : "不匹配";
    } catch {
      if (attempt < MAX_RETRY) await delay(RETRY_DELAY_MS);
      else return "❌";
    }
  }
};

// === 主逻辑 ===
(async () => {
  console.log('🔍 开始检测API搜索功能...');
  
  // 1. 加载配置文件
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ 配置文件不存在:', CONFIG_PATH);
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const apiEntries = Object.entries(config.api_site);
  
  console.log(`📊 当前配置中有 ${apiEntries.length} 个API`);
  
  // 2. 检查API的搜索功能
  const searchResults = [];
  const reachableResults = [];
  
  for (let [key, site] of apiEntries) {
    console.log(`🧪 检查API搜索功能: ${site.name} (${site.api})`);
    
    try {
      // 跳过已禁用的API
      if (site.disabled) {
        console.log(`⏭️  跳过已禁用的API: ${site.name}`);
        continue;
      }
      
      // 检查基本连通性
      const isReachable = await safeGet(site.api);
      if (!isReachable) {
        searchResults.push({ key, name: site.name, api: site.api, searchStatus: "❌", reason: "无法访问" });
        continue;
      }
      
      // 检查搜索功能
      const searchStatus = await testSearch(site.api, SEARCH_KEYWORD);
      searchResults.push({ key, name: site.name, api: site.api, searchStatus });
      reachableResults.push({ key, name: site.name, api: site.api, searchStatus });
      
    } catch (error) {
      searchResults.push({ key, name: site.name, api: site.api, searchStatus: "❌", reason: error.message });
    }
  }
  
  // 3. 统计搜索功能结果
  const searchableApis = reachableResults.filter(result => result.searchStatus === "✅");
  const unsearchableApis = reachableResults.filter(result => result.searchStatus !== "✅");
  
  // 4. 不直接删除无法搜索的API，而是生成报告
  if (unsearchableApis.length > 0) {
    console.log(`⚠️  发现 ${unsearchableApis.length} 个搜索功能异常的API，将在报告中显示:`);
    unsearchableApis.forEach(api => {
      console.log(`- ${api.name} (${api.api}) - 搜索状态: ${api.searchStatus}`);
    });
    
    console.log(`✅ 配置文件保持不变，所有API均被保留`);
    console.log(`✅ 可搜索API数量: ${searchableApis.length}`);
    console.log(`✅ 搜索异常API数量: ${unsearchableApis.length}`);
    console.log(`✅ 总API数量: ${apiEntries.length}`);
  } else {
    console.log(`✅ 所有可访问的API搜索功能正常，无需处理`);
  }
  
  // 5. 更新报告文件，添加搜索功能检测记录
  let report = '';
  if (fs.existsSync(REPORT_PATH)) {
    report = fs.readFileSync(REPORT_PATH, 'utf-8');
  }
  
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 16) + ' CST';
  
  const searchRecord = `
## 🔍 API搜索功能检测记录
**检测时间:** ${now}
**检测关键词:** ${SEARCH_KEYWORD}
**总API数:** ${apiEntries.length}
**可搜索API:** ${searchableApis.length}
**搜索异常API:** ${unsearchableApis.length}

**搜索异常API列表:**
${unsearchableApis.map(api => `- ${api.name} (${api.api}) - 搜索状态: ${api.searchStatus}`).join('\n') || '无'}

**可搜索API列表:**
${searchableApis.map(api => `- ${api.name} (${api.api})`).join('\n') || '无'}
`;
  
  // 将搜索检测记录添加到报告顶部
  const updatedReport = `# API健康报告

${searchRecord}

${report.replace('# API健康报告', '').trim()}`;
  
  fs.writeFileSync(REPORT_PATH, updatedReport, 'utf-8');
  console.log('📄 报告已更新，添加了API搜索功能检测记录');
  
  console.log('\n📊 检测统计：');
  console.log(`- 总API数：${apiEntries.length}`);
  console.log(`- 可访问API：${reachableResults.length}`);
  console.log(`- 可搜索API：${searchableApis.length}`);
  console.log(`- 搜索异常API：${unsearchableApis.length}`);
  console.log(`- 不可访问API：${searchResults.length - reachableResults.length}`);
  
  console.log('🎉 API搜索功能检测完成！');
})();
