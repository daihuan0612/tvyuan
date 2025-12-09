# 🌙 Luna TV 配置编辑器

一个专业的JSON配置文件编辑器，专为Luna TV配置管理而设计。


## ✨ 主要功能

### 🎯 核心功能
- **JSON编辑**: 基于Monaco Editor的专业代码编辑体验
- **实时验证**: 实时JSON格式验证，中文错误提示
- **语法高亮**: 完整的JSON语法高亮和代码折叠
- **格式化**: 一键格式化和压缩JSON

### 🔄 GitHub集成
- **同步加载**: 直接从GitHub仓库加载配置文件
- **安全保存**: 通过GitHub API安全保存到仓库
- **Token管理**: 安全的Token存储和管理
- **版本控制**: 自动生成提交信息和版本历史

### 👁️ 可视化功能
- **树状视图**: JSON数据的可折叠树状展示
- **预览模式**: 格式化后的JSON预览
- **多主题**: 深色、浅色、高对比度主题
- **全屏模式**: 专注的全屏编辑体验

### 📁 文件操作
- **文件上传**: 支持本地JSON文件上传
- **文件下载**: 导出编辑后的配置文件
- **历史记录**: 本地历史版本管理
- **自动保存**: 防止数据丢失的自动保存

### ⌨️ 快捷键支持
- `Ctrl + S`: 保存到GitHub
- `Ctrl + O`: 从GitHub加载
- `Ctrl + U`: 上传文件
- `Ctrl + D`: 下载文件
- `F11`: 全屏模式
- `Ctrl + F`: 查找
- `Ctrl + H`: 查找替换

## 🚀 使用方法

### 1. 获取GitHub Token
1. 访问 [GitHub Settings → Personal access tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 选择 `repo` 权限
4. 复制生成的Token

### 2. 开始使用
1. 在编辑器中输入您的GitHub Token
2. 点击"📥 加载配置"按钮
3. 在编辑器中修改配置
4. 点击"💾 保存配置"或使用 `Ctrl+S`

## 🛠️ 技术特性

- **现代化UI**: 基于CSS Grid和Flexbox的响应式设计
- **PWA支持**: 渐进式Web应用特性
- **TypeScript风格**: 严格的类型检查和错误处理
- **模块化架构**: 清晰的代码组织和功能分离
- **国际化**: 完整的中文界面和错误提示

## 🔒 安全特性

- **Token加密**: 本地Token采用简单加密存储
- **自动过期**: Token自动过期机制（7天）
- **会话隔离**: Token仅在当前会话有效
- **手动清除**: 随时清除本地存储的Token

## 📱 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📄 许可证

MIT License
