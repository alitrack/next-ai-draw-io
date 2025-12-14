import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    /* config options here */
    output: "standalone",
    // Disable font optimization to avoid network issues during build
    experimental: {
        optimizeCss: false,
    },
}

export default nextConfig
