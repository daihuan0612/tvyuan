# API 自动搜集 & API 代理 & JSON 订阅器

这是一个基于 **Cloudflare Pages** 的API自动搜集 + 中转代理 + JSON 配置前缀替换工具。

支持全网自动搜集可用 API 将 API 请求通过 Worker 转发，并自动为 JSON 配置中的 `api` 字段添加/替换前缀。

同时支持生成 **Base58 编码的订阅格式**，并提供**多种配置源选择**，方便在外部应用中快速使用。

---

<details>
  
<summary>✨ 功能特性</summary>
  
# 

### 1. 通用 API 代理

使用 `?url=` 参数转发任意 API 请求

**示例：**

```
https://<你的域名>/?url=https://ikunzyapi.com/api.php/provide/vod/
```

### 2. 多配置源支持

使用 `?source=` 参数选择不同的资源配置：

- **`source=jin18`** - 精简版（仅普通内容，经过健康度检测）
- **`source=jingjian`** - 精简+成人版（经过健康度检测）
- **已移除 `source=full`** - 不再提供未经健康度检测的完整版本

### 3. 统一的 format 参数

使用 `?format=` 参数控制输出格式

- **`format=0`** 或 **`format=raw`** - 原始 JSON
- **`format=1`** 或 **`format=proxy`** - 添加代理前缀的 JSON
- **`format=2`** 或 **`format=base58`** - 原始 JSON 的 Base58 编码
- **`format=3`** 或 **`format=proxy-base58`** - 代理前缀 JSON 的 Base58 编码

### 4. TVBOX配置生成

使用 `?tvbox=` 参数生成TVBOX/影视仓配置

- **`tvbox=standard:false:false`** - 标准模式，原始配置，不编码
- **`tvbox=standard:true:false`** - 标准模式，代理配置，不编码
- **`tvbox=yingshicang:true:false`** - 影视仓模式，代理配置，不编码

格式说明：`tvbox=mode:proxy:base58`
- `mode` - 配置模式：standard（标准模式）、yingshicang（影视仓模式）
- `proxy` - 是否使用代理：true（是）、false（否）
- `base58` - 是否使用Base58编码：true（是）、false（否）

--- 

</details>

<details>
  
<summary>🚀 部署方法</summary>
 
📦 部署到 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)。
2. 下载仓库中的 _worker.js 文件。
3. 在本地新建一个空文件夹（名称随意），将 _worker.js 放入其中。
4. 前往 Workers & Pages → 创建应用程序（Create Application） → Pages → 上传资产（开始使用） → 项目命名 → 创建项目 → 从计算机中选择 → 上传文件夹 → 选择新建的文件 → 部署站点（Deploy Site）。
5. （可选）如需使用 KV：
- 存储和数据库 → Workers KV → Ceate instance  → 命名空间名称（KV Namespaces） 创建一个KV命名空间。
- 新建命名空间（名称随意），绑定变量名为：CONFIG_KV。
- 部署完成后，前往 Pages 控制台 → 设置 → 绑定（Bindings） → 添加 → KV 命名空间  →  变量名为：CONFIG_KV → 选择创建的KV空间 → 保存。
- 保存后返回 “部署” 选项卡。
8. 点击 创建新部署（Create New Deployment），重新上传文件并点击 保存并部署 即可。

- 部署完成后，你就拥有了自己的 API 代理与订阅转换服务！

---   

</details>

<details>
<summary>🔗 使用示例</summary>
  
#  

假设你的 Worker 部署在：[`https://api.example.workers.dev`](https://api.example.workers.dev)

### 示例 1：代理任意 API

```
https://api.example.workers.dev/?url=https://ikunzyapi.com/api.php/provide/vod/
```

### 示例 2：获取原始 JSON 配置（精简+成人版）

```jsx
https://api.example.workers.dev/?format=0&source=jingjian
```

### 示例 3：获取代理前缀的 JSON 配置（精简+成人版）

```jsx
https://api.example.workers.dev/?format=1&source=jingjian
```

### 示例 4：获取原始 Base58 编码（精简+成人版）

```jsx
https://api.example.workers.dev/?format=2&source=jingjian
```

### 示例 5：获取代理前缀的 Base58 编码订阅（精简+成人版）

```jsx
https://api.example.workers.dev/?format=3&source=jingjian
```

### 示例 6：自定义代理前缀

```jsx
https://api.example.workers.dev/?format=1&source=full&prefix=https://my-proxy.com/?url=
```

---   
  
</details>

<details>
<summary>🛠️ 参数说明</summary>
  
# 
  
| 参数     | 说明             | 可选值                          | 示例         |        
| -------- | ---------------- | ------------------------------- | ------------ |
| `url`    | 代理任意 API 请求 | 任意有效 URL                     | `?url=https://...` |
| `format` | 配置模式         | `format=0 或 raw - 原始 JSON` <br> `format=1 或 proxy - 添加代理前缀` <br> `format=2 或 base58 - 原始 Base58` <br> `format=3 或 proxy-base58 - 代理 Base58` | `?format=0` |
| `source` | 配置源选择       | `source=jin18` - 精简版 <br> `source=jingjian` - 精简+成人 <br> `source=full` - 已移除 | `?source=jin18` |
| `prefix` | 自定义代理前缀   | 任意代理地址                      | `?prefix=https://.../?url=` |
| `tvbox`  | TVBOX配置生成    | `tvbox=mode:proxy:base58` 格式，例如：<br> `tvbox=standard:false:false` - 标准模式，原始配置，不编码 <br> `tvbox=standard:true:false` - 标准模式，代理配置，不编码 <br> `tvbox=yingshicang:true:true` - 影视仓模式，代理配置，Base58编码 | `?tvbox=standard:true:false&source=jin18` |
| `errors&limit=10` | 查看错误日志 | `errors&limit=10`                 | `https://<你的域名>?errors&limit=10` |

---  

## 📦 配置源对比

| 配置源 | 资源数量 | 包含成人内容 | 适用场景 |
| --- | --- | --- | --- |
| **jin18** | 动态更新 | ❌ 否 | 家庭使用、轻量级应用 |
| **jingjian** | 动态更新 | ✅ 是 | 个人使用、中等需求 |


🧩 **前缀替换逻辑**  
- 若 JSON 中的 `api` 字段已包含旧前缀（`?url=`），系统会自动去除旧前缀并替换为新的代理前缀。  
- 可自定义代理路径，方便接入私有 API 或多 Worker 配置。
  
---   
  
</details>

<details>
<summary> 📋 完整订阅链接模板</summary>
  
# 

将 `<你的域名>` 替换为你的实际域名地址：

> **域名说明**：
> - **分配域名**：Cloudflare自动分配的域名，如 `xpgyuan.pages.dev`
> - **自定义域名**：您绑定的个性化域名，如 `xfl.de5.net`
> 
> 无论使用哪种域名，订阅链接的格式和功能完全相同，您可以根据需要选择使用。

### 精简版（jin18）

```jsx

# 原始 Base58 编码
https://<你的域名>/?format=2&source=jin18

# 代理 Base58 编码（推荐用于订阅）
https://<你的域名>/?format=3&source=jin18

# TVBox原始订阅
https://<你的域名>/?tvbox=standard:false:false&source=jin18

> **说明**：精简版仅包含普通内容，经过健康度检测，适合家庭使用。

### 精简+成人版（jingjian）

```jsx
# 原始 Base58 编码
https://<你的域名>/?format=2&source=jingjian

# 代理 Base58 编码（推荐用于订阅）
https://<你的域名>/?format=3&source=jingjian

# TVBox原始订阅
https://<你的域名>/?tvbox=standard:false:false&source=jingjian


> **说明**：精简+成人版包含成人内容，经过健康度检测，适合个人使用。

</details>

<details>
<summary>📌 注意事项</summary>
  
# 
  
- **Workers 免费额度**：每天 10 万次请求，适合轻量使用。超出后需升级付费套餐。
- **代理替换逻辑**：如果 JSON 中 `api` 字段已包含 `?url=` 前缀，会先去掉旧前缀，再加上新前缀。
- **Base58 输出**：适合直接作为订阅链接在支持该格式的客户端中使用。
- **配置源更新**：配置源来自 GitHub，内容会定期更新。Worker 会缓存 7200 秒（2小时）。
- **超时设置**：默认请求超时时间为 9 秒，超时后会返回错误信息。
- **CORS 支持**：已启用完整的 CORS 支持，可直接在前端应用中调用。

---   
  
</details>

<details>
<summary>⚠️ 重要提醒：关于TVBox订阅</summary>
# 
项目现在支持TVBox订阅功能，可以直接生成适合TVBOX/影视仓使用的配置：

**TVBox原始订阅**：
   - 链接：`https://<你的域名>/?tvbox=standard:false:false&source=<配置源>`
   - 特点：生成原始TVBOX配置，不经过代理中转

> **关键要点**：
> - 配置源可选择 `jin18`（仅普通内容）或 `jingjian`（含成人内容）
> - 推荐使用 `format=3`（代理 Base58 编码）或 `tvbox` 参数生成TVBOX专用配置
> - 已移除未经健康度检测的 `full` 版本，建议使用经过健康度检测的配置源

</details>

<details>
<summary>🔗 三种域名访问说明</summary>
  
# 
  
项目支持通过三种不同的域名访问，所有订阅链接在任何域名下都可正常使用：

### 1. Cloudflare分配域名
- **格式**：`<项目名>.pages.dev`
- **示例**：`xpgyuan.pages.dev`
- **特点**：Cloudflare自动分配，永久可用

### 2. 带版本哈希的预览域名
- **格式**：`<哈希值>.<项目名>.pages.dev`
- **示例**：`87c67cff.xpgyuan.pages.dev`
- **特点**：用于预览特定部署版本

### 3. 自定义域名
- **格式**：您绑定的个性化域名
- **示例**：`xfl.de5.net`
- **特点**：更易记，专业性强

> **使用建议**：日常使用推荐自定义域名，稳定性好且易记。

</details>

<details>
<summary>🔧 高级配置</summary>
  
# 

### 修改配置源地址

在 `_worker.js` 中找到 `JSON_SOURCES` 对象并修改：

```jsx
const JSON_SOURCES = {
  'jin18': 'https://raw.githubusercontent.com/daihuan0612/tvyuan/main/jin18.json',
  'jingjian': 'https://raw.githubusercontent.com/daihuan0612/tvyuan/main/jingjian.json',
  'full': 'https://raw.githubusercontent.com/daihuan0612/tvyuan/main/LunaTV-config.json'
}
```

> **重要说明**：
> - 这三个链接指向GitHub仓库中的JSON配置文件
> - 部署后需要确保这些文件存在于您的GitHub仓库中
> - 文件名必须与链接中的文件名完全一致
> - 如果使用自己的仓库，请将 `daihuan0612/tvyuan` 替换为您的GitHub用户名和仓库名

### 修改超时时间

找到以下代码并修改超时毫秒数：

```jsx
const timeoutId = setTimeout(() => controller.abort(), 9000) // 改为其他值
```

### 添加访问日志

可以在代码中添加日志记录：

```jsx
console.log(`Request from: ${request.headers.get('cf-connecting-ip')}`)
```

</details>

---

## 🆕 更新内容
- 📄 **自动过滤不可搜索API源**：添加自动过滤不可搜索API源功能。(2025.12.12)
- 📄 **密码登录功能**：添加简单的密码登录功能。(2025.12.12)   
- 📄 **TVBox/影视仓订阅**：添加自动转换为TVBox/影视仓订阅链接。(2025.12.12)    
- 🕵️ **自动搜集网络API**：定期从网络搜集新的API资源，验证有效性后自动添加到配置中。(2025.12.10)  
- 🔍 **自动检测API状态**：每天凌晨1点检测一次 API 可用性，并记录最近 100 次测试报告。  
- 🧩 **源名称前添加图标**：源名称前添加图标，方便区分。  
- 🌐 **被墙资源自动中转**：为受限 API 提供 CF Worker 中转能力。  
- 📄 **添加_comment参数**：为异常源添加_comment参数以方便维护,不影响正常使用!(2025.12.06)

---   

## 🧪 测试与示例

### 🕵️ 自动搜集网络API

项目现在支持自动搜集网络上的API资源，验证其有效性后去重并添加到配置文件中。

**功能特点：**
- 定期从网络搜集新的API资源（每周一次）
- 自动验证API的有效性和搜索功能
- 智能筛选高质量API（去广告、只保留高清/2K/4K等）
- 智能去重，避免重复添加
- 自动生成搜集报告

**使用方法：**
```bash
# 手动运行API搜集脚本
npm run collect

# 运行智能API发现脚本
npm run simple-discover

# 将发现的API添加到配置文件
npm run add-discovered

# 运行完整的自动发现和添加工作流
npm run auto-discover-add
```

**自动运行：**
GitHub Actions工作流会每周自动运行API搜集任务，搜集到的新API会自动添加到配置文件中。

**首次部署：**
首次部署时，建议手动触发一次工作流以立即搜集API资源。

**详细指南：**
查看 [API搜集功能使用指南](COLLECT_API_GUIDE.md) 了解更多使用方法和配置选项。

**配置说明：**
- 搜集脚本: `collect_apis.js`
- 智能发现脚本: `simple_discover.js`
- 自动添加脚本: `add_discovered_apis.js`
- 完整工作流脚本: `auto_discover_and_add.js`
- 搜集工作流: `.github/workflows/collect-apis.yml`
- 自动发现工作流: `.github/workflows/auto-discover-apis.yml`
- 搜集报告: `collection_report.md`
- 发现报告: `discovered_apis.json`

### ✅ 使用中转API测试
- 通过 CORSAPI 转发后，大幅提升视频源可用率。  
- 可“复活”原本无法访问的资源。  
  
# API 健康报告（每日自动检测API状态）

## API 状态（最近更新：2025-12-14 01:10 CST）

- 总 API 数量：78
- 成功 API 数量：51
- 失败 API 数量：27
- 平均可用率：64.8%
- 完美可用率（100%）：42 个
- 高可用率（80%-99%）：7 个
- 中等可用率（50%-79%）：3 个
- 低可用率（<50%）：1 个

<div style="font-size: 11px;">

<!-- API_TABLE_START -->
| 状态 | 资源名称 | 地址 | API | 搜索功能 | 成功次数 | 失败次数 | 成功率 | 最近7天趋势 |
|------|---------|-----|-----|---------|---------:|--------:|-------:|--------------|
| ✅ | 🎬 新浪资源 | [Link](https://api.xinlangapi.com) | [Link](https://api.xinlangapi.com/xinlangapi.php/provide/vod/) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 无尽资源 | [Link](https://api.wujinapi.com) | [Link](https://api.wujinapi.com/api.php/provide/vod/) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 无尽资源2 | [Link](https://api.wujinapi.me) | [Link](https://api.wujinapi.me/api.php/provide/vod/) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 量子资源 | [Link](https://cj.lziapi.com) | [Link](https://cj.lziapi.com/api.php/provide/vod/) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬优质资源 | [Link](https://1080zyk4.com) | [Link](https://api.yzzy-api.com/inc/apijson.php) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬最大资源 | zuida.xyz | [Link](https://api.zuidapi.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬卧龙资源 | [Link](https://wolongzyw.com) | [Link](https://wolongzyw.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬卧龙资源1 | [Link](https://collect.wolongzyw.com) | [Link](https://collect.wolongzyw.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬天涯影视 | [Link](https://tyyszy.com) | [Link](https://tyyszy.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬山海资源 | [Link](https://zy.sh0o.cn) | [Link](https://zy.sh0o.cn/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬无尽资源 | [Link](https://wujinzy.com) | [Link](https://api.wujinapi.me/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬无尽资源1 | [Link](https://wujinzy.com) | [Link](https://api.wujinapi.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬暴风资源 | [Link](https://bfzy.tv) | [Link](https://bfzyapi.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬极速资源 | [Link](https://jszyapi.com) | [Link](https://jszyapi.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬猫眼资源 | [Link](https://www.maoyanzy.com) | [Link](https://api.maoyanapi.top/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬百度云zy | [Link](https://bdzy1.com) | [Link](https://pz.168188.dpdns.org/?url=https://api.apibdzy.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬虎牙资源 | [Link](https://www.huyaapi.com) | [Link](https://www.huyaapi.com/api.php/provide/vod/at/json) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬豆瓣资源 | dbzy.tv | [Link](https://caiji.dbzy5.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬速播资源 | www.subozy.com | [Link](https://subocaiji.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬量子影视 | [Link](https://lzizy.net) | [Link](https://cj.lziapi.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬金鹰资源 | [Link](https://jinyingzy.net) | [Link](https://jyzyapi.com/provide/vod/from/jinyingyun/at/json) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬魔都资源 | [Link](https://www.moduzy.net) | [Link](https://www.mdzyapi.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞-幸资源- | [Link](https://xzytv.com) | [Link](https://xzybb2.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞-黄AVZY | [Link](https://www.pgxdy.com) | [Link](https://www.pgxdy.com/api/json.php) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞jkun资源 | [Link](https://jkunzyapi.com) | [Link](https://jkunzyapi.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞souavZY | [Link](https://api.souavzy.vip) | [Link](https://api.souavzy.vip/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞乐播资源 | [Link](https://lbapi9.com) | [Link](https://lbapi9.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞奶香资源 | [Link](https://Naixxzy.com) | [Link](https://Naixxzy.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞小鸡资源 | [Link](https://xiaojizy.live) | [Link](https://api.xiaojizy.live/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞杏吧资源 | [Link](https://xingba111.com) | [Link](https://xingba111.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞色猫资源 | [Link](https://semaozy1.com) | [Link](https://caiji.semaozy.net/inc/apijson_vod.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞黄色仓库 | [Link](https://hsckzy.xyz) | [Link](https://hsckzy.xyz/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞黑料资源 | [Link](https://heiliaozy.cc) | [Link](https://www.heiliaozyapi.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | TV-光速资源 | [Link](https://api.guangsuapi.com) | [Link](https://api.guangsuapi.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | TV-新浪点播 | [Link](https://api.xinlangapi.com) | [Link](https://api.xinlangapi.com/xinlangapi.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | TV-茅台资源 | [Link](https://caiji.maotaizy.cc) | [Link](https://caiji.maotaizy.cc/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | TV-豆瓣资源 | [Link](https://caiji.dbzy.tv) | [Link](https://caiji.dbzy.tv/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | TV-豆瓣资源 | [Link](https://dbzy.tv) | [Link](https://dbzy.tv/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | TV-金鹰点播 | [Link](https://jinyingzy.com) | [Link](https://jinyingzy.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | TV-金鹰资源 | [Link](https://jyzyapi.com) | [Link](https://jyzyapi.com/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | TV-飘零资源 | [Link](https://p2100.net) | [Link](https://p2100.net/api.php/provide/vod) | ✅ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 小苹果无广源 | [Link](http://121.40.174.45:199/api.php/provide/vod/) | [Link](http://121.40.174.45:199/api.php/provide/vod/) | ❌ | 9 | 0 | 100.0% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 iKun资源 | [Link](https://www.ikunzy.com) | [Link](https://www.ikunzy.com/api.php/provide/vod/) | ✅ | 8 | 1 | 88.9% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬爱奇艺 | [Link](https://iqiyizyapi.com) | [Link](https://iqiyizyapi.com/api.php/provide/vod) | ✅ | 8 | 1 | 88.9% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞-老色逼- | [Link](https://apilsbzy1.com) | [Link](https://apilsbzy1.com/api.php/provide/vod) | ✅ | 8 | 1 | 88.9% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞155-资源 | [Link](https://155zy2.com) | [Link](https://155api.com/api.php/provide/vod) | ✅ | 8 | 1 | 88.9% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞玉兔资源 | [Link](https://apiyutu.com) | [Link](https://apiyutu.com/api.php/provide/vod) | ✅ | 8 | 1 | 88.9% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞百万资源 | [Link](https://api.bwzym3u8.com) | [Link](https://api.bwzyz.com/api.php/provide/vod) | ✅ | 8 | 1 | 88.9% | ✅✅✅✅✅✅✅ |
| ❌ | TV-U酷资源88 | [Link](https://api.ukuapi88.com) | [Link](https://api.ukuapi88.com/api.php/provide/vod) | ❌ | 8 | 1 | 88.9% | ✅✅✅✅✅✅❌ |
| ✅ | 🔞森林资源 | [Link](https://slapibf.com) | [Link](https://beiyong.slapibf.com/api.php/provide/vod) | ✅ | 7 | 2 | 77.8% | ✅✅✅❌✅✅✅ |
| ✅ | TV-360资源 | [Link](https://360zy.com) | [Link](https://360zy.com/api.php/provide/vod) | ✅ | 7 | 2 | 77.8% | ✅✅✅❌✅✅✅ |
| ✅ | 🔞滴滴资源 | [Link](https://didizy.com) | [Link](https://api.ddapi.cc/api.php/provide/vod) | ✅ | 5 | 4 | 55.6% | ❌✅✅❌✅✅✅ |
| 🚨 | 🎬豪华资源 | [Link](https://www.haohuazy.com) | [Link](https://hhzyapi.com/api.php/provide/vod) | ❌ | 2 | 7 | 22.2% | ❌❌❌✅❌❌❌ |
<!-- API_TABLE_END -->


## ⭐ Star History
[![Star History](https://starchart.cc/hafrey1/LunaTV-config.svg?variant=light)](https://starchart.cc/hafrey1/LunaTV-config)










































































































































































































