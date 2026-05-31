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

1. 下载 [最新 release](https://github.com/Tigertiger2026/xspam/releases)
2. 解压 zip 文件
3. Chrome 打开 `chrome://extensions/`
4. 开启"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择解压后的文件夹

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
