#!/usr/bin/env node

/**
 * Build static frontend assets for the Tauri desktop app (no Node.js at runtime).
 *
 * - Runs `next build --webpack` with `output: "export"` in `next.config.ts`
 * - Ensures `out/index.html` exists for Tauri's `frontendDist`
 */

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const rootDir = path.join(__dirname, "..")
const outDir = path.join(rootDir, "out")
const nextCacheDir = path.join(rootDir, ".next")

function rmDir(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true })
}

console.log("[tauri-static-build] Cleaning previous export…")
rmDir(outDir)
rmDir(nextCacheDir)

console.log("[tauri-static-build] Building Next.js (webpack)…")
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm"
execSync(`${npmCmd} run build -- --webpack`, { stdio: "inherit", cwd: rootDir })

const indexHtml = path.join(outDir, "index.html")
if (!fs.existsSync(indexHtml)) {
  throw new Error(
    `[tauri-static-build] Missing ${indexHtml}. Expected Next.js static export output.`,
  )
}

console.log("[tauri-static-build] OK:", indexHtml)
