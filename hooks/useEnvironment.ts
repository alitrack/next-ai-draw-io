// React Hook 用于检测和响应环境变化
import { useEffect, useState } from "react"
import {
    getEnvironmentConfig,
    getOperatingSystem,
    isDesktopEnvironment,
    isTauriEnvironment,
} from "../lib/desktop-environment"

/**
 * React Hook to detect and provide environment information
 * @returns Environment information and detection functions
 */
export function useEnvironment() {
    const [environment, setEnvironment] = useState({
        isTauri: false,
        isDesktop: false,
        os: "unknown" as "windows" | "macos" | "linux" | "unknown",
        hasFileSystemAccess: false,
        apiEndpoint: "",
        storageType: "indexeddb",
    })

    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // 在客户端渲染时检测环境
        if (typeof window !== "undefined") {
            const config = getEnvironmentConfig()
            setEnvironment(config)
            setIsLoading(false)
        }
    }, [])

    return {
        ...environment,
        isLoading,
        isTauriEnvironment,
        isDesktopEnvironment,
        getOperatingSystem,
        refreshEnvironment: () => {
            if (typeof window !== "undefined") {
                const config = getEnvironmentConfig()
                setEnvironment(config)
            }
        },
    }
}

export default useEnvironment
