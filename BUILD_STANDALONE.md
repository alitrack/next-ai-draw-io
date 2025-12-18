# 构建无需 Node.js 的 Tauri 桌面应用

## 方案说明

我们使用**方案1：打包 Portable Node.js + Next.js Standalone**，这样：
- ✅ 用户无需预安装 Node.js
- ✅ 单个安装包，开箱即用
- ✅ 打包大小约 100-120 MB
- ✅ 实现简单可靠

## 快速开始

### 步骤 1：下载 Portable Node.js

```bash
npm run download:node
```

这会自动下载适合你当前系统的 Node.js portable 版本到 `src-tauri/binaries/`。

**手动下载（可选）**：
如果自动下载失败，访问 https://nodejs.org/dist/v20.11.0/ 下载对应平台：
- Windows: `node-v20.11.0-win-x64.zip`
- macOS Intel: `node-v20.11.0-darwin-x64.tar.gz`
- macOS Apple Silicon: `node-v20.11.0-darwin-arm64.tar.gz`
- Linux: `node-v20.11.0-linux-x64.tar.xz`

解压到对应目录：
```
src-tauri/binaries/
├── node-win-x64/          # Windows
├── node-darwin-x64/       # macOS Intel
├── node-darwin-arm64/     # macOS ARM
└── node-linux-x64/        # Linux
```

### 步骤 2：配置环境变量

```bash
cp env.example .env.local
```

编辑 `.env.local`：
```env
AI_PROVIDER=openai
AI_MODEL=gpt-4o
OPENAI_API_KEY=your_api_key_here
```

⚠️ **重要**：不要在 `.env.local` 中存储敏感信息！建议：
- 使用 `ACCESS_CODE_LIST` 要求用户输入密码
- 让用户通过 UI 设置界面输入 API key（BYOK 功能）

### 步骤 3：构建桌面应用

```bash
npm run tauri:build
```

这个命令会：
1. 构建 Next.js standalone 版本
2. 编译 Rust 代码
3. 打包所有资源（Node.js + Next.js + 静态文件）
4. 生成安装包

**构建产物位置**：
- Windows: `src-tauri/target/release/bundle/nsis/` 或 `msi/`
- macOS: `src-tauri/target/release/bundle/dmg/` 或 `app/`
- Linux: `src-tauri/target/release/bundle/deb/` 或 `appimage/`

## 开发模式

在开发时，使用开发服务器（无需下载 Node.js portable）：

```bash
npm run tauri:dev
```

这会：
1. 启动 Next.js dev server (port 6002)
2. 启动 Tauri 窗口并连接到开发服务器
3. 支持热重载

## 命令参考

| 命令 | 说明 |
|------|------|
| `npm run download:node` | 下载当前平台的 portable Node.js |
| `npm run tauri:dev` | 开发模式（需要先运行 `npm run dev`）|
| `npm run tauri:build` | 完整构建流程 |
| `npm run tauri:build:quick` | 快速构建（跳过 Node.js 下载检查）|

## 文件结构

构建后的文件结构：
```
src-tauri/
├── binaries/
│   ├── node-win-x64/        # Windows Node.js (~50MB)
│   ├── node-darwin-x64/     # macOS Intel Node.js
│   ├── node-darwin-arm64/   # macOS ARM Node.js
│   ├── node-linux-x64/      # Linux Node.js
│   ├── start-server.bat     # Windows 启动脚本
│   ├── start-server.sh      # Unix 启动脚本
│   └── README.md
├── src/
│   ├── main.rs
│   └── lib.rs              # 启动逻辑
└── tauri.conf.json         # Tauri 配置
```

打包时会包含：
```
安装包/
├── binaries/
│   └── node-*/             # Portable Node.js
├── .next/
│   ├── standalone/         # Next.js 服务端代码 (~44MB)
│   └── static/             # 静态资源 (~3MB)
└── public/                 # 公共资源 (~1MB)
```

## 工作原理

### 生产模式
1. Tauri 应用启动
2. Rust 代码检测 `binaries/node-*/node.exe`（或 `bin/node`）
3. 启动命令：`node .next/standalone/server.js`
4. Next.js server 运行在 `localhost:3000`
5. Tauri 窗口加载 `http://localhost:3000`

### 开发模式
1. 手动运行 `npm run dev`（或 `tauri:dev` 自动启动）
2. Next.js dev server 运行在 `localhost:6002`
3. Tauri 窗口加载开发服务器

## 多平台构建

### 在 Windows 上构建所有平台

1. 下载所有平台的 Node.js：
```bash
# Windows
npm run download:node

# macOS (手动下载并解压到 src-tauri/binaries/)
# Linux (手动下载并解压到 src-tauri/binaries/)
```

2. 使用 GitHub Actions 或 CI/CD 跨平台构建

### 在 macOS 上构建

```bash
npm run download:node  # 下载 macOS Node.js
npm run tauri:build
```

### 在 Linux 上构建

```bash
npm run download:node  # 下载 Linux Node.js
npm run tauri:build
```

## 包大小优化

当前大小：~100-120 MB

**可优化项**：
1. **压缩 Node.js**：使用 UPX 压缩可执行文件（减少 ~20MB）
2. **移除不需要的 Node.js 模块**：只保留必要的文件（减少 ~10MB）
3. **优化 Next.js 输出**：移除 source maps（减少 ~5MB）

如需更小的体积（15-25 MB），参考 `docs/TAURI_BUILD_GUIDE.md` 中的**方案2：纯 Rust 实现**。

## 故障排除

### 错误：Node.js executable not found

**原因**：没有下载 portable Node.js

**解决**：
```bash
npm run download:node
```

### 错误：Next.js server not found

**原因**：没有构建 Next.js

**解决**：
```bash
npm run build
```

### Windows 提取错误

如果 `download:node` 在 Windows 上无法自动解压：

1. 手动解压 `src-tauri/binaries/node-win-x64.zip`
2. 确保目录结构：
   ```
   src-tauri/binaries/node-win-x64/
   ├── node.exe
   ├── npm
   └── ...
   ```

### 端口被占用

如果 port 3000 被占用：
1. 修改 `scripts/build-with-node.js` 中的 `PORT` 变量
2. 修改 `src-tauri/tauri.conf.json` 中的 `url`
3. 重新构建

### 构建很慢

第一次构建需要编译 Rust 代码（5-15 分钟）。后续构建会快很多（1-3 分钟）。

使用快速构建（跳过 Next.js 重新构建）：
```bash
npm run tauri:build:quick
```

## 发布和分发

### 签名（可选但推荐）

**Windows**：使用 Code Signing Certificate
**macOS**：使用 Apple Developer Certificate
**Linux**：无需签名

参考：https://tauri.app/v2/guides/distribute/sign/

### 自动更新

配置 Tauri Updater 实现应用自动更新：
https://tauri.app/v2/guides/distribute/updater/

### 示例 GitHub Actions

创建 `.github/workflows/release.yml` 实现自动化构建：
```yaml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        platform: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run download:node
      - run: npm run tauri:build
      - uses: actions/upload-artifact@v3
        with:
          name: release-${{ matrix.platform }}
          path: src-tauri/target/release/bundle/
```

## 安全注意事项

1. **环境变量**：不要在 `.env.local` 中存储生产环境的 API keys
2. **访问控制**：使用 `ACCESS_CODE_LIST` 限制访问
3. **BYOK**：鼓励用户使用自己的 API keys（通过 UI 设置）
4. **更新**：定期更新依赖和 Node.js 版本
5. **签名**：为发布版本签名以防篡改

## 支持

如有问题，请查看：
- 详细指南：`docs/TAURI_BUILD_GUIDE.md`
- 快速入门：`TAURI_QUICKSTART.md`
- GitHub Issues：https://github.com/DayuanJiang/next-ai-draw-io/issues
