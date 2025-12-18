# Tauri 桌面应用构建指南

本指南说明如何构建 Next AI Draw.io 的 Tauri 桌面版本。

## 概述

本项目已配置为使用 Tauri 2 构建桌面应用。当前实现方式：

- **开发模式**：Tauri 连接到 Next.js 开发服务器 (localhost:6002)
- **生产模式**：Tauri 启动内嵌的 Next.js standalone 服务器并连接

⚠️ **重要**：当前构建**需要用户安装 Node.js**，因为 Next.js standalone 需要 Node.js runtime 来运行 API routes。

## 前置要求

### 1. 安装 Rust

访问 [rustup.rs](https://rustup.rs/) 安装 Rust 工具链。

Windows 用户可能还需要安装：
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)（Windows 11 已预装）

### 2. 安装 Node.js

下载并安装 [Node.js](https://nodejs.org/)（推荐 LTS 版本）。

### 3. 安装项目依赖

```bash
npm install
```

## 开发模式

### 方式 1：同时启动 Next.js 和 Tauri（推荐）

```bash
npm run tauri:dev
```

这会：
1. 自动启动 Next.js 开发服务器 (port 6002)
2. 启动 Tauri 窗口并连接到开发服务器
3. 支持热重载

### 方式 2：分别启动

终端 1 - 启动 Next.js 开发服务器：
```bash
npm run dev
```

终端 2 - 启动 Tauri：
```bash
npx tauri dev
```

## 生产构建

### 构建桌面应用

```bash
npm run tauri:build
```

这会：
1. 构建 Next.js standalone 输出 (`.next/standalone`)
2. 编译 Rust 代码
3. 打包成平台特定的安装包

构建产物位置：
- Windows: `src-tauri/target/release/bundle/msi/` 或 `nsis/`
- macOS: `src-tauri/target/release/bundle/dmg/` 或 `app/`
- Linux: `src-tauri/target/release/bundle/deb/` 或 `appimage/`

### 环境配置

在构建前，需要配置 AI provider：

1. 复制环境变量示例文件：
```bash
cp env.example .env.local
```

2. 编辑 `.env.local` 配置你的 AI provider：
```bash
AI_PROVIDER=openai
AI_MODEL=gpt-4o
OPENAI_API_KEY=your_api_key_here
```

⚠️ **注意**：这些环境变量会被打包进应用中。**不要在 .env.local 中存储敏感信息**。建议：
- 使用 `ACCESS_CODE_LIST` 要求用户输入密码
- 让用户通过设置界面输入自己的 API key（BYOK 功能）

## 当前限制

### ❌ 用户需要安装 Node.js

当前的构建方式要求**最终用户的电脑上安装 Node.js**，因为：
1. Next.js standalone 模式生成的 `server.js` 需要 Node.js runtime
2. API routes（`/api/chat` 等）使用了大量 Node.js 特定的包（Vercel AI SDK）

### ✅ 解决方案选项

如果你想要构建**完全独立的可执行文件**（不需要用户安装 Node.js），有以下选项：

#### 选项 1：使用 Node.js 打包工具（推荐，容易实现）

使用 [pkg](https://github.com/vercel/pkg) 或 [nexe](https://github.com/nexe/nexe) 将 Next.js standalone + Node.js runtime 打包成单个可执行文件：

```bash
# 安装 pkg
npm install -g pkg

# 构建 Next.js
npm run build

# 使用 pkg 打包（需要额外配置）
pkg .next/standalone/server.js --targets node18-win-x64 --output next-server.exe
```

然后修改 Tauri 配置使用打包后的可执行文件。

#### 选项 2：将 API 逻辑迁移到 Rust（彻底，但工作量大）

将所有 API routes 的功能用 Rust + Tauri commands 重写：
- 在 Rust 中实现与 AI providers 的 HTTP 通信
- 处理流式响应、工具调用等复杂逻辑
- 前端改为调用 Tauri commands 而不是 fetch API

**预计工作量**：数周，因为需要：
- 为 9 个不同的 AI providers 实现 HTTP 客户端
- 处理流式 SSE 响应
- 实现 function calling/tool use 协议
- 迁移 Langfuse 遥测等功能

#### 选项 3：使用 Deno（中等复杂度）

用 [Deno](https://deno.land/) 替代 Node.js：
- Deno 可以编译成单个可执行文件（`deno compile`）
- 但需要将代码从 Node.js/npm 迁移到 Deno 生态

## 测试构建

### 测试开发模式

```bash
npm run tauri:dev
```

应该看到：
1. Next.js 开发服务器启动在 port 6002
2. Tauri 窗口打开并显示应用界面
3. 可以正常使用 AI 聊天功能

### 测试生产构建

```bash
npm run tauri:build
```

构建完成后：
1. 找到生成的安装包（见上文"构建产物位置"）
2. 在**安装了 Node.js 的电脑上**安装并运行
3. 检查控制台日志确认 Next.js server 正常启动

## 已知问题

1. **端口占用**：如果 3000 端口被占用，需要修改 `src-tauri/src/lib.rs` 和 `src-tauri/tauri.conf.json` 中的端口配置

2. **资源路径**：确保 `.next/standalone` 正确打包进资源目录

3. **静态资源**：Next.js standalone 需要手动复制 `.next/static` 和 `public` 目录（已在配置中处理）

## 进阶配置

### 自定义应用图标

替换 `src-tauri/icons/` 目录下的图标文件：
- `icon.ico` - Windows 图标
- `icon.icns` - macOS 图标
- `icon.png` - Linux/通用图标

推荐使用 [Tauri Icon](https://github.com/tauri-apps/tauri/tree/dev/tooling/cli/src/interface/rust.rs) 生成器。

### 修改应用标识符

编辑 `src-tauri/tauri.conf.json`：
```json
{
  "identifier": "com.yourcompany.nextaidrawio"
}
```

### 添加自动更新

参考 [Tauri Updater](https://tauri.app/v2/guides/distribute/updater/) 文档配置自动更新功能。

## 故障排除

### Rust 编译错误

```bash
# 清理 Rust 缓存
cd src-tauri
cargo clean

# 重新构建
cd ..
npm run tauri:build
```

### Next.js 构建错误

```bash
# 清理 Next.js 缓存
rm -rf .next
npm run build
```

### Tauri CLI 找不到

```bash
# 确保 Tauri CLI 已安装
npm install @tauri-apps/cli@latest --save-dev
```

## 参考资料

- [Tauri 官方文档](https://tauri.app/v2/)
- [Next.js Standalone 输出](https://nextjs.org/docs/advanced-features/output-file-tracing)
- [Tauri + Next.js 集成指南](https://tauri.app/v2/guides/frontend/nextjs/)

## 支持

如有问题，请在 GitHub Issues 中反馈。
