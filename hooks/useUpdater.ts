// React Hook for Tauri desktop app updater
"use client"

import { useCallback, useState } from "react"
import { useEnvironmentContext } from "@/contexts/environment-context"

declare global {
    interface Window {
        __TAURI__: any
    }
}

/**
 * Hook for desktop app updater functionality
 * Provides functions for checking and installing updates
 */
export function useUpdater() {
    const { isTauri, isLoading } = useEnvironmentContext()
    const [isChecking, setIsChecking] = useState(false)
    const [isChecked, setIsChecked] = useState(false)
    const [hasUpdate, setHasUpdate] = useState(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Check for updates
     */
    const checkForUpdates = useCallback(async (): Promise<boolean> => {
        if (isLoading) return false

        if (!isTauri) {
            setError("Updater is only available in desktop environment")
            return false
        }

        try {
            setIsChecking(true)
            setError(null)

            // Check for updates using Tauri updater
            const result = await window.__TAURI__.invoke(
                "check_for_updates_command",
            )

            setIsChecked(true)
            setHasUpdate(result)

            return result
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Failed to check for updates"
            setError(errorMessage)
            console.error("Error checking for updates:", err)
            return false
        } finally {
            setIsChecking(false)
        }
    }, [isTauri, isLoading])

    /**
     * Install updates (if available)
     */
    const installUpdates = useCallback(async (): Promise<boolean> => {
        if (isLoading) return false

        if (!isTauri) {
            setError("Updater is only available in desktop environment")
            return false
        }

        try {
            setError(null)

            // In Tauri, updates are typically handled automatically by the updater dialog
            // We can trigger a manual check which will show the update dialog if updates are available
            const result = await window.__TAURI__.invoke(
                "check_for_updates_command",
            )

            return result
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Failed to install updates"
            setError(errorMessage)
            console.error("Error installing updates:", err)
            return false
        }
    }, [isTauri, isLoading])

    /**
     * Reset update check state
     */
    const reset = useCallback(() => {
        setIsChecked(false)
        setHasUpdate(false)
        setError(null)
    }, [])

    return {
        // State
        isChecking,
        isChecked,
        hasUpdate,
        error,
        isAvailable: isTauri && !isLoading,

        // Functions
        checkForUpdates,
        installUpdates,
        reset,

        // Utils
        clearError: () => setError(null),
    }
}

export default useUpdater
