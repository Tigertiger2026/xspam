# XSpam Client vs 原版差异说明

## 主要变化

### 1. 移除了后端依赖
- ❌ 删除了 `SERVER_URL` 常量
- ❌ 删除了登录/认证系统
- ❌ 删除了 Pro 会员限制
- ❌ 删除了后端 API 调用

### 2. 删除了 Mod List 功能
整个 `pages/modlists/` 目录已删除，包括：
- Mod List 创建和管理
- Mod List 订阅
- Mod List 详细页

### 3. 删除了依赖文件
- `useAuthInfo.svelte.ts`
- `AuthButton.svelte`
- `localModlistSubscriptions.ts`
- `openLoginWindow.ts`

### 4. 修改的文件

#### content.ts
- 移除了 `refreshModListSubscribedUsers()`
- 移除了 `refreshAuthInfo()`
- 简化了 `autoCheckPendingUsers()`
- 保留了核心的 `quickBlock()` 功能

#### batchBlockUsers.ts
- 移除了 Pro 限制检查
- 移除了 `getAuthInfo` 参数
- 保留了批量 block 核心逻辑

#### filter.ts
- 删除了 `modListFilter()` 函数
- 保留了其他过滤器（sharedSpamFilter 等）

#### constants.ts
- 只保留了 `SPAM_DATA_METADATA_URL`
- 删除了 `SERVER_URL`

#### app.svelte
- 移除了 ModList 路由
- 移除了 MutedWords 路由
- 移除了 `QueryClientProvider`（不需要了）
- 保留了核心页面路由

### 5. 保留的核心功能

| 功能 | 状态 |
|------|------|
| 云端 Spam 库同步 | ✅ |
| 本地 Block/Hide | ✅ |
| 一键 Block 按钮 | ✅ |
| 已屏蔽账号管理 | ✅ |
| 自定义关键词过滤 | ✅ |
| Dashboard 统计 | ✅ |

## 数据源

开源版本只从以下地址同步数据：
```
https://github.com/Tigertiger2026/xspam/releases/download/spam-data-latest/metadata.json
```

数据作为 GitHub Release 发布，不需要后端服务器。

## 安装

```bash
pnpm install
pnpm dev     # 开发模式
pnpm build   # 构建
pnpm zip     # 打包
```

## 发布到 Chrome Web Store

1. 运行 `pnpm zip` 生成 zip 文件
2. 登录 Chrome Web Store 开发者后台
3. 上传 zip 文件
4. 提交审核
