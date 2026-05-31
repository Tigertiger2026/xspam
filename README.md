# XSpam Client

去中心化的 X/Twitter 垃圾账号屏蔽浏览器插件。

## 功能

- 🛡️ 自动隐藏页面上的垃圾账号内容
- 📥 从 GitHub Release 同步社区维护的垃圾账号数据库
- 🔨 一键 Block 垃圾账号
- 🏠 完全本地运行，无需后端服务
- 🔒 隐私优先，不上传任何数据

## 安装

### Chrome Web Store
（待上架）

### 手动安装

1. 访问本项目的 [Releases 页面](https://github.com/Tigertiger2026/xspam/releases)。
2. 在最新的发版中，下载以 `.zip` 结尾的插件安装包（例如：`mass-block-twitter-1.0.0-chrome.zip`）。**请注意：不要下载 `spam-data-latest` 中的 json 数据文件，也不要下载 Source code 源码压缩包。**
3. 将下载的 `.zip` 安装包解压，得到一个文件夹。
4. 在 Chrome 浏览器地址栏输入 `chrome://extensions/` 并打开扩展管理页面。
5. 在右上角开启 **"开发者模式"**。
6. 点击左上角的 **"加载已解压的扩展程序"**，然后选择你刚刚解压出来的文件夹，即可完成安装！

## 数据源

插件从以下地址同步垃圾账号数据库：

```
https://github.com/Tigertiger2026/xspam/releases/download/spam-data-latest/metadata.json
```

数据由社区维护，欢迎贡献。

## 隐私

- 所有数据存储在本地 IndexedDB
- 不上传用户的 block 记录
- 不收集任何用户行为数据

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 打包
pnpm zip
```

## 项目结构

```
src/
├── entrypoints/
│   ├── background.ts          # Service Worker
│   ├── inject.content.ts      # 内容脚本，拦截 X API
│   ├── login.content.ts       # 登录处理
│   └── content/               # Dashboard UI
│       ├── app.svelte         # 主应用
│       └── pages/             # 页面
├── lib/
│   ├── api/twitter/           # X API 调用
│   ├── db.ts                  # IndexedDB 存储
│   ├── cloudSpam.ts           # 云端数据同步
│   ├── filter.ts              # 过滤逻辑
│   ├── content.ts             # Block 功能
│   ├── observe.ts             # 按钮插入
│   └── settings.ts            # 设置
└── i18n/                      # 国际化
```

## License

GPL-3.0
