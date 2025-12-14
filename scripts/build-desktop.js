#!/usr/bin/env node

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

// 检查是否安装了 cargo
try {
    execSync("cargo --version", { stdio: "ignore" })
} catch (error) {
    console.error(
        "错误: 未找到 Cargo。请先安装 Rust: https://www.rust-lang.org/tools/install",
    )
    process.exit(1)
}

// 构建 Next.js 应用
console.log("正在构建 Next.js 应用...")
execSync("npm run build", { stdio: "inherit" })

// 创建干净的输出目录
console.log("正在准备静态资源...")
const outDir = path.join(__dirname, "../out")
const standaloneDir = path.join(__dirname, "../.next/standalone")

// 删除旧的输出目录
if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true })
}

// 创建新的输出目录
fs.mkdirSync(outDir, { recursive: true })

// 复制静态资源（排除 node_modules）
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src)
    const stats = exists && fs.statSync(src)
    const isDirectory = exists && stats.isDirectory()

    if (isDirectory) {
        fs.mkdirSync(dest, { recursive: true })
        fs.readdirSync(src).forEach((childItemName) => {
            // 跳过 node_modules 目录
            if (childItemName !== "node_modules") {
                copyRecursiveSync(
                    path.join(src, childItemName),
                    path.join(dest, childItemName),
                )
            }
        })
    } else {
        fs.copyFileSync(src, dest)
    }
}

// 复制静态文件和公共资源
copyRecursiveSync(
    path.join(__dirname, "../public"),
    path.join(outDir, "public"),
)
copyRecursiveSync(
    path.join(__dirname, "../.next/static"),
    path.join(outDir, "_next/static"),
)

// 复制 standalone 目录中的内容（排除 node_modules）
copyRecursiveSync(standaloneDir, outDir)

// 复制 package.json 并修改以适合作为静态服务器
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

console.log("静态资源准备完成")

// 构建 Tauri 应用
console.log("正在构建 Tauri 桌面应用...")
execSync("npm run tauri:build", { stdio: "inherit" })

console.log("桌面应用构建完成!")
console.log("可执行文件位于 src-tauri/target/release 目录中")
