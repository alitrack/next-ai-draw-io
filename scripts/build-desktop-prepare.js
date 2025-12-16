#!/usr/bin/env node

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

console.log("=== Windows 兼容的 Tauri 桌面应用构建脚本 ===\n")

// Step 1: 构建 Next.js（允许部分失败）
console.log("步骤 1: 构建 Next.js 应用...")
try {
    execSync("npm run build", { stdio: "inherit" })
    console.log("✓ Next.js 构建完成\n")
} catch (error) {
    console.log("⚠ Next.js 构建遇到错误，继续处理...\n")
}

// Step 2: 手动复制 standalone 缺失的文件（处理文件名问题）
console.log("步骤 2: 修复 standalone 目录中的缺失文件...")

const serverChunksDir = path.join(__dirname, "../.next/server/chunks")
const standaloneChunksDir = path.join(
    __dirname,
    "../.next/standalone/.next/server/chunks",
)

const illegalCharsRegex = /[:<>"|?*]/g

function copyMissingFiles() {
    if (
        !fs.existsSync(serverChunksDir) ||
        !fs.existsSync(standaloneChunksDir)
    ) {
        console.log("  跳过：chunks 目录不存在")
        return
    }

    const sourceFiles = fs.readdirSync(serverChunksDir)
    const targetFiles = new Set(fs.readdirSync(standaloneChunksDir))

    let copiedCount = 0

    for (const file of sourceFiles) {
        const sourcePath = path.join(serverChunksDir, file)
        const stats = fs.statSync(sourcePath)

        // 只处理文件，跳过目录
        if (!stats.isFile()) continue

        // 检查文件是否已存在于 standalone 中
        if (!targetFiles.has(file)) {
            // 文件不存在，可能是因为文件名包含非法字符
            const sanitizedFilename = file.replace(illegalCharsRegex, "_")
            const targetPath = path.join(standaloneChunksDir, sanitizedFilename)

            try {
                fs.copyFileSync(sourcePath, targetPath)
                console.log(`  复制: ${file} -> ${sanitizedFilename}`)
                copiedCount++
            } catch (error) {
                console.warn(`  警告: 无法复制 ${file}: ${error.message}`)
            }
        }
    }

    console.log(`✓ 复制了 ${copiedCount} 个缺失的文件\n`)
}

copyMissingFiles()

// Step 3: 更新 server.js 和相关文件中的引用
console.log("步骤 3: 更新文件引用...")

function updateImportReferences(file) {
    try {
        let content = fs.readFileSync(file, "utf8")
        let modified = false

        // 查找并替换所有 require() 或 import 语句中包含冒号的模块名
        // 但是排除 node:* 内置模块（这些是 Node.js 的有效模块标识符）
        const requirePattern = /require\(['"]([^'"]*:[^'"]*)['"]\)/g
        const importPattern = /from\s+['"]([^'"]*:[^'"]*)['"]/g

        content = content.replace(requirePattern, (match, modulePath) => {
            // 跳过 node:* 内置模块 - 这些是有效的 Node.js 模块标识符
            if (modulePath.startsWith("node:")) {
                return match // 保持原样
            }

            const sanitized = modulePath.replace(illegalCharsRegex, "_")
            if (sanitized !== modulePath) {
                console.log(
                    `    在 ${path.basename(file)} 中更新引用: ${modulePath} -> ${sanitized}`,
                )
                modified = true
            }
            return `require('${sanitized}')`
        })

        content = content.replace(importPattern, (match, modulePath) => {
            // 跳过 node:* 内置模块 - 这些是有效的 Node.js 模块标识符
            if (modulePath.startsWith("node:")) {
                return match // 保持原样
            }

            const sanitized = modulePath.replace(illegalCharsRegex, "_")
            if (sanitized !== modulePath) {
                console.log(
                    `    在 ${path.basename(file)} 中更新引用: ${modulePath} -> ${sanitized}`,
                )
                modified = true
            }
            return `from '${sanitized}'`
        })

        if (modified) {
            fs.writeFileSync(file, content, "utf8")
        }
    } catch (error) {
        // 忽略错误
    }
}

// 更新 standalone 目录中的所有 .js 文件
function updateAllReferences(dir) {
    if (!fs.existsSync(dir)) return

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
            updateAllReferences(fullPath)
        } else if (entry.name.endsWith(".js")) {
            updateImportReferences(fullPath)
        }
    }
}

const standaloneDir = path.join(__dirname, "../.next/standalone")
updateAllReferences(standaloneDir)
console.log("✓ 引用更新完成\n")

// Step 4: 准备静态资源
console.log("步骤 4: 准备静态资源...")
const outDir = path.join(__dirname, "../out")

// 删除旧的输出目录
if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true })
}

// 创建新的输出目录
fs.mkdirSync(outDir, { recursive: true })

// 复制静态资源
function copyRecursive(src, dest, skipNodeModules = true) {
    if (!fs.existsSync(src)) return

    const stats = fs.statSync(src)

    if (stats.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true })
        fs.readdirSync(src).forEach((item) => {
            // Only skip node_modules if flag is set AND we're not in standalone directory
            if (item === "node_modules" && skipNodeModules) {
                return
            }
            copyRecursive(
                path.join(src, item),
                path.join(dest, item),
                skipNodeModules,
            )
        })
    } else {
        fs.copyFileSync(src, dest)
    }
}

// 复制 public
const publicDir = path.join(__dirname, "../public")
if (fs.existsSync(publicDir)) {
    copyRecursive(publicDir, path.join(outDir, "public"))
}

// 复制 standalone (包括 node_modules！)
if (fs.existsSync(standaloneDir)) {
    copyRecursive(standaloneDir, outDir, false) // Don't skip node_modules
}

// 复制 .next/static 到两个位置：
// 1. _next/static - 用于浏览器请求
// 2. .next/static - 用于 standalone 服务器
const staticDir = path.join(__dirname, "../.next/static")
if (fs.existsSync(staticDir)) {
    console.log("  复制静态资源到 _next/static (浏览器路径)...")
    copyRecursive(staticDir, path.join(outDir, "_next/static"))
    console.log("  复制静态资源到 .next/static (standalone 服务器路径)...")
    copyRecursive(staticDir, path.join(outDir, ".next/static"))
}

// 复制环境变量文件（如果存在）
console.log("  检查并复制环境变量文件...")
const envFiles = [
    ".env.production.local",
    ".env.local",
    ".env.production",
    ".env",
]
let envCopied = false

for (const envFile of envFiles) {
    const envPath = path.join(__dirname, "..", envFile)
    if (fs.existsSync(envPath)) {
        const destPath = path.join(outDir, envFile)
        fs.copyFileSync(envPath, destPath)
        console.log(`  ✓ 复制 ${envFile} 到 out/`)
        envCopied = true
        break // 只复制第一个找到的文件
    }
}

if (!envCopied) {
    console.log("  ⚠ 警告：未找到环境变量文件 (.env.local 等)")
    console.log("  提示：请在项目根目录创建 .env.local 文件以配置 API keys")
}

// 创建 package.json
const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"),
)
const serverPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    private: true,
    scripts: {
        start: "node server.js",
    },
}
fs.writeFileSync(
    path.join(outDir, "package.json"),
    JSON.stringify(serverPackageJson, null, 2),
)

console.log("✓ 静态资源准备完成\n")

console.log("=== 准备工作完成！现在可以构建 Tauri 应用 ===\n")
