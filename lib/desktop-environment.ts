// 桌面环境检测工具
// 用于区分应用是在桌面环境还是Web环境中运行

/**
 * 检测是否在 Tauri 桌面环境中运行
 * @returns boolean indicating if running in Tauri desktop environment
 */
export function isTauriEnvironment(): boolean {
    // Tauri 应用会在全局对象中注入 __TAURI__ 对象
    return typeof window !== "undefined" && "__TAURI__" in window
}

/**
 * 检测操作系统类型
 * @returns 操作系统类型 ('windows' | 'macos' | 'linux' | 'unknown')
 */
export function getOperatingSystem():
    | "windows"
    | "macos"
    | "linux"
    | "unknown" {
    if (typeof window === "undefined" || !isTauriEnvironment()) {
        return "unknown"
    }

    // 在 Tauri 环境中，我们可以通过 navigator.userAgent 来检测操作系统
    const userAgent = navigator.userAgent.toLowerCase()

    if (userAgent.includes("win")) {
        return "windows"
    } else if (userAgent.includes("mac")) {
        return "macos"
    } else if (userAgent.includes("linux")) {
        return "linux"
    } else {
        return "unknown"
    }
}

/**
 * 检测是否在桌面环境中运行（Tauri 或 Electron）
 * @returns boolean indicating if running in desktop environment
 */
export function isDesktopEnvironment(): boolean {
    return isTauriEnvironment()
}

/**
 * 获取环境特定的配置
 * @returns 包含环境特定配置的对象
 */
export function getEnvironmentConfig() {
    const isTauri = isTauriEnvironment()
    const os = getOperatingSystem()

    return {
        isTauri,
        isDesktop: isDesktopEnvironment(),
        os,
        // 桌面环境下可以使用文件系统
        hasFileSystemAccess: isTauri,
        // 桌面环境下可能有不同的API端点
        apiEndpoint: isTauri ? "http://localhost:6001" : "",
        // 桌面环境下可能有不同的存储机制
        storageType: isTauri ? "filesystem" : "indexeddb",
    }
}

// 默认导出环境配置
export default getEnvironmentConfig()
