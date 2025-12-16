#!/usr/bin/env node

const { execSync } = require("child_process")
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

console.log("开始构建 Tauri 桌面应用...\n")

// 准备资源并构建 Tauri 应用
// build-desktop-prepare.js 会被 tauri.conf.json 中的 beforeBuildCommand 自动调用
try {
    execSync("npm run tauri:build", { stdio: "inherit" })
    console.log("\n✓ 桌面应用构建完成!")
    console.log("可执行文件位于 src-tauri/target/release 目录中")
} catch (error) {
    console.error("\n✗ 构建失败")
    process.exit(1)
}
