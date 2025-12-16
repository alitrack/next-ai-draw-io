# Windows Tauri 构建问题解决方案

## 问题描述

在 Windows 上构建 Tauri 桌面应用时，Next.js 的 standalone 模式会生成包含冒号 `:` 的文件名（如 `[externals]_node:async_hooks_*.js`），这在 Windows 文件系统中是非法字符，导致文件复制失败。

## 错误示例
```
Failed to copy traced files for .next\server\app\api\chat\route.js
Error: EINVAL: invalid argument, copyfile
'[externals]_node:async_hooks_*.js' -> '...'
```

## 解决方案

### 方案 1：使用 WSL（推荐）

在 Windows Subsystem for Linux 中构建：

```bash
# 在 WSL 中
cd /mnt/d/dev/next-ai-draw-io
npm install
npm run build:desktop
```

### 方案 2：使用 Docker

创建 Linux 构建环境：

```bash
# 使用 Linux 容器构建
docker run --rm -v "%cd%":/app -w /app node:20 bash -c "npm install && npm run build:desktop"
```

### 方案 3：在 Mac/Linux 上构建

跨平台编译（最简单的方法）：
- 在 Mac/Linux 机器上执行 `npm run build:desktop`
- Tauri 会自动为 Windows 生成可执行文件（如果配置了交叉编译）

### 方案 4：手动修复（临时方案）

如果必须在 Windows 本地构建，可以尝试：

1. 先运行一次构建查看错误
2. 手动找到 `.next/server/chunks/` 中包含冒号的文件
3. 重命名这些文件（将 `:` 替换为 `_`）
4. 手动运行 `npm run tauri:build`

**警告**：此方案不稳定，因为文件名可能每次构建都不同。

## 长期解决方案

等待 Next.js 团队修复此问题，或提交 PR 到 Next.js 仓库以支持 Windows 文件名限制。

相关 GitHub Issues:
- https://github.com/vercel/next.js/issues

## 当前状态

- ✅ Mac/Linux：正常工作
- ❌ Windows 本地：有文件名限制问题
- ✅ Windows + WSL：正常工作
- ✅ Windows + Docker：正常工作

## 推荐构建流程（Windows 用户）

```bash
# 安装 WSL (一次性设置)
wsl --install

# 在 WSL 中构建
wsl
cd /mnt/d/dev/next-ai-draw-io
npm run build:desktop
```

构建完成后，可执行文件将在 `src-tauri/target/release/` 目录中。
