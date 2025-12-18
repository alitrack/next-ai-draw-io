# Tauri 桌面应用快速入门

## 测试开发模式

### 1. 确保 Rust 已安装

```bash
rustc --version
```

如果没有安装，访问 https://rustup.rs/ 安装 Rust。

### 2. 启动开发模式

```bash
npm run tauri:dev
```

第一次运行会比较慢，因为需要编译 Rust 代码。后续运行会快很多。

预期行为：
- Next.js 开发服务器启动在 port 6002
- Tauri 窗口打开，显示应用界面
- 可以正常使用所有功能（AI 聊天、图表编辑等）

### 故障排除

**问题：找不到 Rust 编译器**
```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows 用户使用：
# https://rustup.rs/
```

**问题：WebView2 相关错误（Windows）**
- 下载并安装 [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

**问题：端口 6002 被占用**
- 修改 `package.json` 中 `dev` 脚本的端口
- 同时修改 `src-tauri/tauri.conf.json` 中的 `devUrl`

## 构建生产版本

### 1. 配置环境变量

```bash
cp env.example .env.local
```

编辑 `.env.local`，配置你的 AI provider：

```env
AI_PROVIDER=openai
AI_MODEL=gpt-4o
OPENAI_API_KEY=sk-...
```

### 2. 构建

```bash
npm run tauri:build
```

构建时间：5-15 分钟（取决于电脑性能）

### 3. 查找构建产物

Windows:
```
src-tauri/target/release/bundle/nsis/next-ai-draw-io-desktop_0.1.0_x64-setup.exe
```

或者查看:
```
src-tauri/target/release/bundle/
```

### 4. 测试安装包

⚠️ **重要**：确保目标电脑已安装 Node.js

运行安装包，安装并启动应用。

## 下一步

参考 `docs/TAURI_BUILD_GUIDE.md` 了解：
- 如何打包完全独立的可执行文件（不需要用户安装 Node.js）
- 自定义应用图标和配置
- 发布和分发策略
