import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    /* config options here */
    // Static export so the Tauri desktop app runs with zero Node.js at runtime.
    output: "export",
    trailingSlash: true,
    // Disable image optimization for static builds
    images: {
        unoptimized: true,
    },
}

export default nextConfig
