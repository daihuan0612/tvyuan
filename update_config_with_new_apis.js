// update_config_with_new_apis.js - 将新API源添加到配置文件中
const fs = require('fs');
const path = require('path');

// 读取现有配置
const configPath = path.join(__dirname, 'LunaTV-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 新的API源数据（来自用户输入）
const newApis = {
  "cache_time": 7200,
  "api_site": {
    "aqyzy": {
      "name": "🎬爱奇艺",
      "api": "https://iqiyizyapi.com/api.php/provide/vod",
      "detail": "https://iqiyizyapi.com"
    },
    "2k_source": {
      "name": "小苹果无广源",
      "api": "http://121.40.174.45:199/api.php/provide/vod/",
      "detail": "http://121.40.174.45:199/api.php/provide/vod/",
      "is_adult": false
    },
    "adfree_source": {
      "name": "部分无广源",
      "api": "https://yonghu.ffzyapi8.com/api.php/provide/vod/from/ffm3u8/at/json/",
      "detail": "https://yonghu.ffzyapi8.com",
      "is_adult": false
    },
    "iqiyizyapi.com": {
      "name": "🎬-爱奇艺-",
      "api": "https://iqiyizyapi.com/api.php/provide/vod",
      "detail": "https://iqiyizyapi.com"
    },
    "dbzy.tv": {
      "name": "🎬豆瓣资源",
      "api": "https://caiji.dbzy5.com/api.php/provide/vod",
      "detail": "dbzy.tv"
    },
    "1080zyk4.com": {
      "name": "🎬优质资源",
      "api": "https://api.yzzy-api.com/inc/apijson.php",
      "detail": "https://1080zyk4.com"
    },
    "www.maoyanzy.com": {
      "name": "🎬猫眼资源",
      "api": "https://api.maoyanapi.top/api.php/provide/vod",
      "detail": "https://www.maoyanzy.com"
    },
    "www.ryzyw.com": {
      "name": "🎬如意资源",
      "api": "https://jjpz.hafrey.dpdns.org/?url=https://cj.rycjapi.com/api.php/provide/vod",
      "detail": "https://www.ryzyw.com"
    },
    "bfzy.tv": {
      "name": "🎬暴风资源",
      "api": "https://bfzyapi.com/api.php/provide/vod",
      "detail": "https://bfzy.tv"
    },
    "zuida.xyz": {
      "name": "🎬最大资源",
      "api": "https://api.zuidapi.com/api.php/provide/vod",
      "detail": "https://zuida.xyz"
    },
    "zuidazy.co": {
      "name": "🎬最大点播",
      "api": "https://zuidazy.me/api.php/provide/vod",
      "detail": "https://zuidazy.co"
    },
    "wujinzy.me": {
      "name": "🎬无尽资源",
      "api": "https://api.wujinapi.me/api.php/provide/vod",
      "detail": "https://wujinzy.com"
    },
    "wujinzy.com": {
      "name": "🎬无尽影视",
      "api": "https://api.wujinapi.com/api.php/provide/vod",
      "detail": "https://wujinzy.com"
    },
    "www.haohuazy.com": {
      "name": "🎬豪华资源",
      "api": "https://jjpz.hafrey.dpdns.org/?url=https://hhzyapi.com/api.php/provide/vod",
      "detail": "https://www.haohuazy.com"
    },
    "www.subozy.com": {
      "name": "🎬速播资源",
      "api": "https://subocaiji.com/api.php/provide/vod",
      "detail": "www.subozy.com"
    },
    "jinyingzy.net": {
      "name": "🎬金鹰资源",
      "api": "https://jyzyapi.com/provide/vod/from/jinyingyun/at/json",
      "detail": "https://jinyingzy.net"
    },
    "zy.sh0o.cn": {
      "name": "🎬山海资源",
      "api": "https://zy.sh0o.cn/api.php/provide/vod",
      "detail": "https://zy.sh0o.cn"
    },
    "360zy": {
      "name": "TV-360资源",
      "api": "https://360zy.com/api.php/provide/vod",
      "detail": "https://360zy.com",
      "is_adult": false
    },
    "ukuapi88": {
      "name": "TV-U酷资源88",
      "api": "https://api.ukuapi88.com/api.php/provide/vod",
      "detail": "https://api.ukuapi88.com",
      "is_adult": false
    },
    "ikunzy": {
      "name": "TV-ikun资源",
      "api": "https://ikunzyapi.com/api.php/provide/vod",
      "detail": "https://ikunzyapi.com",
      "is_adult": false
    },
    "guangsuapi": {
      "name": "TV-光速资源",
      "api": "https://api.guangsuapi.com/api.php/provide/vod",
      "detail": "https://api.guangsuapi.com",
      "is_adult": false
    },
    "wolongzyw": {
      "name": "TV-卧龙点播",
      "api": "https://collect.wolongzyw.com/api.php/provide/vod",
      "detail": "https://collect.wolongzyw.com",
      "is_adult": false
    },
    "tyyszy": {
      "name": "TV-天涯资源",
      "api": "https://tyyszy.com/api.php/provide/vod",
      "detail": "https://tyyszy.com",
      "is_adult": false
    },
    "xinlangapi": {
      "name": "TV-新浪点播",
      "api": "https://api.xinlangapi.com/xinlangapi.php/provide/vod",
      "detail": "https://api.xinlangapi.com",
      "is_adult": false
    },
    "zuidazy": {
      "name": "TV-最大点播",
      "api": "http://zuidazy.me/api.php/provide/vod",
      "detail": "http://zuidazy.me",
      "is_adult": false
    },
    "zuidapi": {
      "name": "TV-最大资源",
      "api": "https://api.zuidapi.com/api.php/provide/vod",
      "detail": "https://api.zuidapi.com",
      "is_adult": false
    },
    "dyttzyapi": {
      "name": "TV-电影天堂资源",
      "api": "http://caiji.dyttzyapi.com/api.php/provide/vod",
      "detail": "http://caiji.dyttzyapi.com",
      "is_adult": false
    },
    "1080zyku_json": {
      "name": "TV-神马云",
      "api": "https://api.1080zyku.com/inc/apijson.php/",
      "detail": "https://api.1080zyku.com",
      "is_adult": false
    },
    "hongniuzy2": {
      "name": "TV-红牛资源",
      "api": "https://www.hongniuzy2.com/api.php/provide/vod",
      "detail": "https://www.hongniuzy2.com",
      "is_adult": false
    },
    "maotaizy": {
      "name": "TV-茅台资源",
      "api": "https://caiji.maotaizy.cc/api.php/provide/vod",
      "detail": "https://caiji.maotaizy.cc",
      "is_adult": false
    },
    "dbzy_caiji": {
      "name": "TV-豆瓣资源",
      "api": "https://caiji.dbzy.tv/api.php/provide/vod",
      "detail": "https://caiji.dbzy.tv",
      "is_adult": false
    },
    "dbzy": {
      "name": "TV-豆瓣资源",
      "api": "https://dbzy.tv/api.php/provide/vod",
      "detail": "https://dbzy.tv",
      "is_adult": false
    },
    "jinyingzy": {
      "name": "TV-金鹰点播",
      "api": "https://jinyingzy.com/api.php/provide/vod",
      "detail": "https://jinyingzy.com",
      "is_adult": false
    },
    "jyzyapi": {
      "name": "TV-金鹰资源",
      "api": "https://jyzyapi.com/api.php/provide/vod",
      "detail": "https://jyzyapi.com",
      "is_adult": false
    },
    "ffzyapi": {
      "name": "TV-非凡资源",
      "api": "https://cj.ffzyapi.com/api.php/provide/vod",
      "detail": "https://cj.ffzyapi.com",
      "is_adult": false
    },
    "p2100": {
      "name": "TV-飘零资源",
      "api": "https://p2100.net/api.php/provide/vod",
      "detail": "https://p2100.net",
      "is_adult": false
    },
    "ffzynew": {
      "name": "TV-非凡影视new",
      "api": "https://api.ffzyapi.com/api.php/provide/vod",
      "detail": "http://ffzy5.tv",
      "is_adult": false
    },
    "wolongzyw_com": {
      "name": "TV-卧龙资源",
      "api": "https://wolongzyw.com/api.php/provide/vod",
      "detail": "https://wolongzyw.com",
      "is_adult": false
    },
    "jszyapi": {
      "name": "TV-极速资源",
      "api": "https://jszyapi.com/api.php/provide/vod",
      "detail": "https://jszyapi.com",
      "is_adult": false
    },
    "caijidb": {
      "name": "🎬豆瓣资源",
      "api": "https://caiji.dbzy5.com/api.php/provide/vod",
      "detail": "dbzy.tv"
    },
    "tyyszyapi": {
      "name": "🎬天涯影视",
      "api": "https://tyyszy.com/api.php/provide/vod",
      "detail": "https://tyyszy.com"
    },
    "ckzy.me": {
      "name": "🎬CK资源",
      "api": "https://ckzy.me/api.php/provide/vod",
      "detail": "https://ckzy.me"
    },
    "wolong": {
      "name": "🎬卧龙资源",
      "api": "https://wolongzyw.com/api.php/provide/vod",
      "detail": "https://wolongzyw.com"
    },
    "ikun": {
      "name": "🎬iKun资源",
      "api": "https://ikunzyapi.com/api.php/provide/vod",
      "detail": "https://ikunzy.com"
    },
    "lzi": {
      "name": "🎬量子影视",
      "api": "https://cj.lziapi.com/api.php/provide/vod",
      "detail": "https://lzizy.net"
    },
    "dyttzy": {
      "name": "🎬电影天堂",
      "api": "http://caiji.dyttzyapi.com/api.php/provide/vod",
      "detail": "http://caiji.dyttzyapi.com"
    },
    "1080y": {
      "name": "🎬优质资源",
      "api": "https://api.yzzy-api.com/inc/apijson.php",
      "detail": "https://1080zyk4.com"
    },
    "myzy": {
      "name": "🎬猫眼资源",
      "api": "https://api.maoyanapi.top/api.php/provide/vod",
      "detail": "https://www.maoyanzy.com"
    },
    "lzcaiji": {
      "name": "🎬量子资源",
      "api": "https://cj.lzcaiji.com/api.php/provide/vod",
      "detail": "https://cj.lzcaiji.com"
    },
    "ruyi": {
      "name": "🎬如意资源",
      "api": "https://jjpz.hafrey.dpdns.org/?url=https://cj.rycjapi.com/api.php/provide/vod",
      "detail": "https://www.ryzyw.com"
    },
    "zy360": {
      "name": "🎬360资源",
      "api": "https://360zy.com/api.php/provide/vod",
      "detail": "https://360zy.com"
    },
    "collectwolongzy": {
      "name": "🎬卧龙资源1",
      "api": "https://collect.wolongzyw.com/api.php/provide/vod",
      "detail": "https://collect.wolongzyw.com"
    },
    "jisu": {
      "name": "🎬极速资源",
      "api": "https://jszyapi.com/api.php/provide/vod",
      "detail": "https://jszyapi.com"
    },
    "mdzy": {
      "name": "🎬魔都资源",
      "api": "https://www.mdzyapi.com/api.php/provide/vod",
      "detail": "https://www.moduzy.net"
    },
    "mozhuazy": {
      "name": "🎬魔爪资源",
      "api": "https://jjpz.hafrey.dpdns.org/?url=https://mozhuazy.com/api.php/provide/vod",
      "detail": "https://mozhuazy.com"
    },
    "ffzy1": {
      "name": "🎬非凡资源",
      "api": "https://api.ffzyapi.com/api.php/provide/vod",
      "detail": "https://cj.ffzyapi.com"
    },
    "ffzy": {
      "name": "🎬非凡影视",
      "api": "https://cj.ffzyapi.com/api.php/provide/vod",
      "detail": "https://cj.ffzyapi.com"
    },
    "bfzy": {
      "name": "🎬暴风资源",
      "api": "https://bfzyapi.com/api.php/provide/vod",
      "detail": "https://bfzy.tv"
    },
    "zuid": {
      "name": "🎬最大资源",
      "api": "https://api.zuidapi.com/api.php/provide/vod",
      "detail": "zuida.xyz"
    },
    "yinghua": {
      "name": "🎬樱花资源",
      "api": "https://m3u8.apiyhzy.com/api.php/provide/vod",
      "detail": "https://yhzy.cc"
    },
    "wujin": {
      "name": "🎬无尽资源",
      "api": "https://api.wujinapi.me/api.php/provide/vod",
      "detail": "https://wujinzy.com"
    },
    "wujincom": {
      "name": "🎬无尽资源1",
      "api": "https://api.wujinapi.com/api.php/provide/vod",
      "detail": "https://wujinzy.com"
    },
    "xsd_sdzyapi": {
      "name": "🎬索尼资源",
      "api": "https://suoniapi.com/api.php/provide/vod",
      "detail": "https://suonizy.net"
    },
    "kuaichezy": {
      "name": "🎬快车资源",
      "api": "https://caiji.kuaichezy.org/api.php/provide/vod",
      "detail": "https://kuaichezy.com"
    },
    "shandian": {
      "name": "🎬闪电资源",
      "api": "https://xsd.sdzyapi.com/api.php/provide/vod",
      "detail": "https://shandianzy.com"
    },
    "wwzy": {
      "name": "🎬旺旺短剧",
      "api": "https://wwzy.tv/api.php/provide/vod",
      "detail": "https://wwzy.tv"
    },
    "apiwwzy": {
      "name": "🎬旺旺资源",
      "api": "https://api.wwzy.tv/api.php/provide/vod",
      "detail": "https://api.wwzy.tv"
    },
    "hhzyapi": {
      "name": "🎬豪华资源",
      "api": "https://hhzyapi.com/api.php/provide/vod",
      "detail": "https://www.haohuazy.com"
    },
    "subocaiji": {
      "name": "🎬速播资源",
      "api": "https://subocaiji.com/api.php/provide/vod",
      "detail": "www.subozy.com"
    },
    "xiaomaomi": {
      "name": "🎬小猫咪",
      "api": "https://zy.xmm.hk/api.php/provide/vod",
      "detail": "http://zy.xmm.hk"
    },
    "huyaapi": {
      "name": "🎬虎牙资源",
      "api": "https://www.huyaapi.com/api.php/provide/vod/at/json",
      "detail": "https://www.huyaapi.com"
    },
    "xbzy": {
      "name": "🔞杏吧资源",
      "api": "https://xingba111.com/api.php/provide/vod",
      "detail": "https://xingba111.com"
    },
    "api.sexnguon": {
      "name": "🔞色南国",
      "api": "https://api.sexnguon.com/api.php/provide/vod",
      "detail": "https://api.sexnguon.com"
    }
    // 注意：用户提供的JSON似乎未完整，缺少结尾部分
  }
};

// 合并API源，重复的以用户提供的名称为准
Object.keys(newApis.api_site).forEach(key => {
  // 直接覆盖现有API源，确保使用用户提供的名称
  config.api_site[key] = newApis.api_site[key];
});

// 应用过滤规则：移除标记为"无法搜索"的源
const filteredApiSites = {};
Object.keys(config.api_site).forEach(key => {
  const site = config.api_site[key];
  // 检查是否有注释标记为"无搜索结果"或"暂不支持搜索"等
  if (site._comment && (
    site._comment.includes("无搜索结果") || 
    site._comment.includes("暂不支持搜索") ||
    site._comment.includes("禁止搜索结果") ||
    site._comment.includes("污染搜索结果")
  )) {
    console.log(`跳过无法搜索的源: ${site.name} (${key})`);
    return; // 跳过这个源
  }
  
  // 检查名称中是否包含"无法搜索"字样
  if (site.name && site.name.includes("无法搜索")) {
    console.log(`跳过无法搜索的源: ${site.name} (${key})`);
    return; // 跳过这个源
  }
  
  // 保留有效的API源
  filteredApiSites[key] = site;
});

config.api_site = filteredApiSites;

// 写入更新后的配置
fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
console.log('配置文件已更新，共 ' + Object.keys(config.api_site).length + ' 个API源');