/**
 * Tauri 环境检测工具
 */

/**
 * 检测当前是否运行在 Tauri 环境中
 */
export function isTauriEnvironment(): boolean {
    if (typeof window === "undefined") {
        return false
    }

    // 检查 __TAURI__ 全局对象是否存在
    return (
        ("__TAURI_INTERNALS__" in window &&
            (window as any).__TAURI_INTERNALS__ !== undefined) ||
        ("__TAURI__" in window && (window as any).__TAURI__ !== undefined)
    )
}

/**
 * 获取 Tauri API (如果可用)
 */
export function getTauriAPI() {
    if (!isTauriEnvironment()) {
        return null
    }

    // 类型安全的方式访问 Tauri API
    const tauri = (window as any).__TAURI__

    // Tauri v2 global injection differs by version / config.
    // Try common layouts:
    // - window.__TAURI__.invoke
    // - window.__TAURI__.core.invoke
    // - window.__TAURI__.tauri.invoke (legacy)
    const invoke =
        tauri?.invoke ?? tauri?.core?.invoke ?? tauri?.tauri?.invoke ?? null

    const event = tauri?.event ?? null
    const listen = event?.listen ?? null

    return {
        invoke,
        event: {
            listen,
        },
    }
}

/**
 * 检测是否为 Web 环境
 */
export function isWebEnvironment(): boolean {
    return !isTauriEnvironment()
}

/**
 * 根据环境选择实现
 */
export function selectByEnvironment<T>(options: {
    tauri: T
    web: T
}): T {
    return isTauriEnvironment() ? options.tauri : options.web
}

/**
 * 条件执行（仅 Tauri）
 */
export async function ifTauri<T>(
    fn: () => T | Promise<T>,
): Promise<T | undefined> {
    if (isTauriEnvironment()) {
        return await fn()
    }
    return undefined
}

/**
 * 条件执行（仅 Web）
 */
export async function ifWeb<T>(fn: () => T | Promise<T>): Promise<T | undefined> {
    if (isWebEnvironment()) {
        return await fn()
    }
    return undefined
}
