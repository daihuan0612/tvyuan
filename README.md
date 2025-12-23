
# 根据：hafrey1  https://github.com/hafrey1/LunaTV-config 的代码魔改的
# 因为之前一直想私密使用，但是不公开仓库拉取不了仓库json，所以才公开的，
# 这也是为什么没有Fork的原因。
# 再次感谢 hafrey1

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
- 保存后返回 "部署" 选项卡。
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
| `source` | 配置源选择       | `source=jin18` - 精简版 <br> `source=jingjian` - 精简+成人版 | `?source=jin18` |
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
> - **自定义域名**：您绑定的个性化域名，如 `<你的域名>`
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
- **配置源更新**：配置源来自 GitHub，内容会定期更新。Worker 会缓存 300000 毫秒（5分钟）。
- **超时设置**：默认请求超时时间为 3 秒，超时后会返回错误信息。
- **CORS 支持**：已启用完整的 CORS 支持，可直接在前端应用中调用。

---   
  
</details>

<details>
<summary>⚠️ 重要提醒：关于TVBox订阅</summary>
# 
项目现在支持TVBox订阅功能，可以直接生成适合TVBOX/影视仓使用的配置：

**TVBox原始订阅**
   - 链接：`https://<你的域名>/?tvbox=standard:false:false&source=<配置源>`
   - 特点：生成原始TVBOX配置，不经过代理中转

> **关键要点**
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
  'jingjian': 'https://raw.githubusercontent.com/daihuan0612/tvyuan/main/jingjian.json'
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
const timeoutId = setTimeout(() => controller.abort(), 3000) // 改为其他值
```

### 添加访问日志

可以在代码中添加日志记录：

```jsx
console.log(`Request from: ${request.headers.get('cf-connecting-ip')}`)
```

</details>

---

## 🆕 更新内容
- 📅 **API收集频率调整**：将API自动收集频率从每周改为每月，减少资源消耗。(2025.12.23)
- 📊 **API数量限制**：添加API收集数量限制，最多收集20个API，防止数量过多导致工作流失败。(2025.12.23)
- 📄 **修复README格式**：修复API健康列表格式，包括删除地址栏、只显示"链接"文字、不换行、调整列宽等。(2025.12.23)
- 🔍 **修复API处理机制**：修改无法搜索API的处理方法，不再直接删除，与不健康API使用相同机制。(2025.12.23)
- 🔗 **修复订阅链接**：修复订阅链接返回旧数据的问题，确保使用最新配置。(2025.12.23)
- 📋 **简化配置源**：只保留jin18和jingjian两个配置源，提高配置质量。(2025.12.23)
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
- 定期从网络搜集新的API资源（每月一次）
- 自动验证API的有效性和搜索功能
- 智能筛选高质量API（去广告、只保留高清/2K/4K等）
- 智能去重，避免重复添加
- 自动生成搜集报告
- API数量限制为20个，防止数量过多导致工作流失败

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
GitHub Actions工作流会每月自动运行API搜集任务，搜集到的新API会自动添加到配置文件中。

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

## API 状态（最近更新：2025-12-23 23:33 CST）

- 总 API 数量：54
- 成功 API 数量：43
- 失败 API 数量：11
- 平均可用率：89.5%
- 完美可用率（100%）：34 个
- 高可用率（80%-99%）：11 个
- 中等可用率（50%-79%）：7 个
- 低可用率（<50%）：2 个

<div style="font-size: 11px;">

<!-- API_TABLE_START -->
| 状态 | 资源名称                       | API   | 搜索功能 | 成功次数 | 失败 | 成功率 | 最近7天趋势 |
|------|--------------------------------|-------|---------|---------:|------:|-------:|--------------|
| ✅ | 🎬 百度云 资源 | [链接](https://pz.168188.dpdns.org/?url=https://api.apibdzy.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 电影天堂 资源 | [链接](http://caiji.dyttzyapi.com/api.php/provide/vod) | ❌ | 10 | 0 | 100% | --✅✅✅✅✅ |
| ✅ | 🎬 非凡 资源 | [链接](https://cj.ffzyapi.com/api.php/provide/vod) | ❌ | 10 | 0 | 100% | --✅✅✅✅✅ |
| ✅ | 🎬 非凡影视 资源 | [链接](https://api.ffzyapi.com/api.php/provide/vod) | ❌ | 10 | 0 | 100% | --✅✅✅✅✅ |
| ✅ | 🎬 虎牙 资源 | [链接](https://www.huyaapi.com/api.php/provide/vod/at/json) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 极速 资源 | [链接](https://jszyapi.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 金鹰 资源 | [链接](https://jyzyapi.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 金鹰Json 资源 | [链接](https://jyzyapi.com/provide/vod/from/jinyingyun/at/json) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 茅台 资源 | [链接](https://caiji.maotaizy.cc/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 魔都 资源 | [链接](https://www.mdzyapi.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 七星秒播2 资源 | [链接](http://cj.lziapi.com/api.php/provide/vod/) | ✅ | 5 | 0 | 100% | --✅✅✅✅✅ |
| ✅ | 🎬 山海 资源 | [链接](https://zy.sh0o.cn/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 少广10线 (量子) | [链接](https://cj.lziapi.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 少广1线 (小苹果) | [链接](https://bfzyapi.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 少广2线 (备用) | [链接](http://121.40.174.45:199/api.php/provide/vod/) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 少广4线 (无尽) | [链接](https://api.wujinapi.me/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 少广5线 (光速) | [链接](https://api.guangsuapi.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 少广6线 (速播) | [链接](https://subocaiji.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 少广7线 (金鹰) | [链接](https://jinyingzy.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 天涯 资源 | [链接](https://tyyszy.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 卧龙 资源 | [链接](https://wolongzyw.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 卧龙点播 资源 | [链接](https://collect.wolongzyw.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 无广2线 (优质) | [链接](https://api.yzzy-api.com/inc/apijson.php) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 无广4线 (猫眼) | [链接](https://api.maoyanapi.top/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 无尽影视 资源 | [链接](https://api.wujinapi.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 新浪点播 资源 | [链接](https://api.xinlangapi.com/xinlangapi.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 最大 资源 | [链接](https://api.zuidapi.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞 黑料 资源 | [链接](https://www.heiliaozyapi.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞 乐播 资源 | [链接](https://lbapi9.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞 奶香 资源 | [链接](https://Naixxzy.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞 色猫 资源 | [链接](https://caiji.semaozy.net/inc/apijson_vod.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞 小鸡 资源 | [链接](https://api.xiaojizy.live/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞 杏吧 资源 | [链接](https://xingba111.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞 幸 资源 | [链接](https://xzybb2.com/api.php/provide/vod) | ✅ | 28 | 0 | 100% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 飘零 资源 | [链接](https://p2100.net/api.php/provide/vod) | ✅ | 27 | 1 | 96.4% | ✅✅✅✅✅✅✅ |
| ✅ | 🎬 U酷 资源 | [链接](https://api.ukuapi88.com/api.php/provide/vod) | ✅ | 27 | 1 | 96.4% | ✅✅✅✅✅✅✅ |
| ✅ | 🔞 155 资源 | [链接](https://155api.com/api.php/provide/vod) | ✅ | 26 | 2 | 92.9% | ✅✅✅✅❌✅✅ |
| ✅ | 🔞 老色逼 资源 | [链接](https://apilsbzy1.com/api.php/provide/vod) | ✅ | 26 | 2 | 92.9% | ✅✅✅✅✅❌✅ |
| ❌ | 🔞 玉兔 资源 | [链接](https://apiyutu.com/api.php/provide/vod) | ❌ | 26 | 2 | 92.9% | ✅✅✅✅✅✅❌ |
| ❌ | 🔞 jkun 资源 | [链接](https://jkunzyapi.com/api.php/provide/vod) | ❌ | 26 | 2 | 92.9% | ✅✅✅✅❌✅❌ |
| ✅ | 🎬 爱奇艺 资源 | [链接](https://iqiyizyapi.com/api.php/provide/vod) | ✅ | 25 | 3 | 89.3% | ✅✅✅✅❌❌✅ |
| ✅ | 🎬 豆瓣 资源 | [链接](https://caiji.dbzy5.com/api.php/provide/vod) | ✅ | 25 | 3 | 89.3% | ✅✅✅✅✅✅✅ |
| ✅ | 🆕 新增资源-dbzy.tv_1 | [链接](https://dbzy.tv/api.php/provide/vod) | ✅ | 21 | 3 | 87.5% | ✅✅----✅ |
| ✅ | 🎬 360 资源 | [链接](https://360zy.com/api.php/provide/vod) | ❌ | 24 | 4 | 85.7% | ✅✅✅✅❌❌✅ |
| 🚨 | 🔞 森林 资源 | [链接](https://beiyong.slapibf.com/api.php/provide/vod) | ❌ | 23 | 5 | 82.1% | ✅✅✅✅❌❌❌ |
| 🚨 | 🔞 滴滴 资源 | [链接](https://api.ddapi.cc/api.php/provide/vod) | ❌ | 21 | 7 | 75% | ✅✅✅✅❌❌❌ |
| 🚨 | 🎬 少广3线 (iKun) | [链接](https://ikunzyapi.com/api.php/provide/vod) | ❌ | 6 | 4 | 60% | --✅✅❌❌❌ |
| 🚨 | 🎬 少广8线 (红牛) | [链接](https://www.hongniuzy2.com/api.php/provide/vod) | ❌ | 6 | 4 | 60% | --✅✅❌❌❌ |
| ✅ | 🎬 少广9线 (360) | [链接](https://360zy.com/api.php/provide/vod?) | ❌ | 3 | 2 | 60% | --✅✅❌❌✅ |
| 🚨 | 🎬 无广1线 (非凡) | [链接](https://yonghu.ffzyapi8.com/api.php/provide/vod/from/ffm3u8/at/json/) | ❌ | 6 | 4 | 60% | --✅✅❌❌❌ |
| 🚨 | 🎬 无广3线 (神马) | [链接](https://api.1080zyku.com/inc/apijson.php/) | ❌ | 6 | 4 | 60% | --✅✅❌❌❌ |
| 🚨 | 🎬 最大点播 资源 | [链接](https://zuidazy.me/api.php/provide/vod) | ❌ | 6 | 4 | 60% | --✅✅❌❌❌ |
| 🚨 | 🎬 豪华 资源 | [链接](https://jjpz.hafrey.dpdns.org/?url=https://hhzyapi.com/api.php/provide/vod) | ❌ | 0 | 10 | 0% | --❌❌❌❌❌ |
| 🚨 | 🎬 如意 资源 | [链接](https://jjpz.hafrey.dpdns.org/?url=https://cj.rycjapi.com/api.php/provide/vod) | ❌ | 0 | 10 | 0% | --❌❌❌❌❌ |
<!-- API_TABLE_END -->
# 免责声明
在使用本仓库前，请务必仔细阅读本声明。 任何以任何形式访问、使用、复制、修改或分发本仓库内容的行为，均视为已阅读并同意本免责声明的全部条款。

# 一、定义与范围
**本仓库**指本 GitHub 仓库及其直接或间接相关的其他仓库。
**维护者**指本仓库的管理员、维护者及任何参与内容整理与分享的人员。
**仓库内容**指本仓库中提供的全部配置文件、源定义、代码片段、文档说明及引用的外部资源信息。

# 二、仓库用途说明（MoonTV/LunaTV 源配置）
本仓库主要提供 MoonTV/LunaTV等相关项目的源配置、订阅定义或配置示例，内容均整理自互联网公开信息。
本仓库内容 仅用于学习、测试与技术研究目的，包括但不限于配置格式研究、源聚合方式分析及客户端兼容性测试。
本仓库不存储、不托管、不分发任何音视频文件、媒体流或受版权保护的内容，亦不提供任何形式的媒体服务。
除非另有明确书面声明，本仓库 不授予任何商业使用许可。
严禁将本仓库内容用于任何违反法律法规、版权规则或所在司法辖区政策的用途。

# 三、无任何担保声明
本仓库及其内容均以 “现状（AS IS）” 方式提供，维护者不作出任何形式的明示或暗示担保，包括但不限于：
**合法性**
**准确性**
**完整性**
**可用性**
**适用于特定目的**
使用本仓库内容所产生的一切风险均由使用者自行承担。

# #四、责任限制
因使用、误用、修改或分发本仓库内容而导致的任何直接或间接损失，包括但不限于数据丢失、系统故障、服务中断、法律风险等，维护者概不负责。
用户在使用本仓库内容过程中，如违反其所在国家或地区的法律法规，所产生的一切法律责任均由用户自行承担，与本仓库及维护者无关。

# 五、第三方软件与项目声明
MoonTV、LunaTV 及任何在本仓库中提及的第三方软件、硬件、服务或项目，均 与本仓库不存在任何隶属、合作、授权或背书关系。
本仓库不对任何第三方软件或服务的功能、合法性或可用性作出保证。
因使用第三方软件或服务所产生的一切后果，均由使用者自行承担。

# 六、转载与分发限制
未经维护者明确授权，禁止以任何形式在其他平台、网站、公众号、自媒体或镜像站点转载、发布或再分发本仓库内容。
允许在 GitHub 平台内出于学习和研究目的进行 fork，但须保留本免责声明且不得改变仓库性质或用途。
通过正常开发工具获取的域名、地址或配置信息，且未涉及逆向工程或网络攻击行为的，不构成对计算机系统的非法侵入。

# 七、知识产权与侵权处理
若任何单位或个人认为本仓库内容可能侵犯其合法权益，请及时联系维护者，并提供有效的身份证明及权属证明材料。
在核实相关材料后，维护者将依法依规尽快删除或处理相关内容。

# 八、使用期限与删除建议
本仓库内容仅供 临时学习与研究参考。
任何关于使用时限（如 24 小时）的表述，均属于风险提示性质，并非强制性法律义务（法律另有规定的除外）。
建议用户在完成学习或研究后，及时删除本仓库内容的本地副本。
如对相关功能存在长期或生产环境需求，请自行独立开发实现。

# 九、司法辖区提示
本仓库内容 不建议在中国大陆地区使用，尤其是在相关应用或配置可能违反当地法律法规的情形下。
用户应自行评估并承担因使用本仓库内容所带来的合规与法律风险。

# 十、免责声明的修改与接受
维护者保留在不另行通知的情况下，随时修改或补充本免责声明的权利。
任何对本仓库内容的访问、使用、复制、修改或分发行为，均视为已充分阅读并接受本免责声明的全部内容。
若您不同意本免责声明中的任何条款，请立即停止使用并删除本仓库的全部内容。


















