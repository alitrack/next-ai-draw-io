// React Hook for file system operations in Tauri desktop environment
"use client"

import { useCallback, useState } from "react"
import { useEnvironmentContext } from "@/contexts/environment-context"

declare global {
    interface Window {
        __TAURI__: any
    }
}

/**
 * Hook for file system operations
 * Provides functions for reading/writing files in desktop environment
 */
export function useFileSystem() {
    const { isTauri, isLoading } = useEnvironmentContext()
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    /**
     * Open file dialog and read file content
     */
    const openFile = useCallback(async (): Promise<{
        path: string
        content: string
    } | null> => {
        if (isLoading) return null

        if (!isTauri) {
            setError(
                "File system operations are only available in desktop environment",
            )
            return null
        }

        try {
            setIsProcessing(true)
            setError(null)

            // Open file dialog
            const filePath = await window.__TAURI__.invoke("open_file_dialog")

            if (!filePath) {
                return null
            }

            // Read file content
            const content = await window.__TAURI__.invoke("read_file", {
                filePath,
            })

            return { path: filePath, content }
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Failed to open file"
            setError(errorMessage)
            console.error("Error opening file:", err)
            return null
        } finally {
            setIsProcessing(false)
        }
    }, [isTauri, isLoading])

    /**
     * Save file dialog and write content to file
     */
    const saveFile = useCallback(
        async (
            content: string,
            defaultPath?: string,
        ): Promise<string | null> => {
            if (isLoading) return null

            if (!isTauri) {
                setError(
                    "File system operations are only available in desktop environment",
                )
                return null
            }

            try {
                setIsProcessing(true)
                setError(null)

                let filePath: string | null = null

                if (defaultPath) {
                    // Use provided path
                    filePath = defaultPath
                } else {
                    // Open save dialog
                    filePath = await window.__TAURI__.invoke("save_file_dialog")
                }

                if (!filePath) {
                    return null
                }

                // Write file content
                await window.__TAURI__.invoke("write_file", {
                    filePath,
                    content,
                })

                return filePath
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to save file"
                setError(errorMessage)
                console.error("Error saving file:", err)
                return null
            } finally {
                setIsProcessing(false)
            }
        },
        [isTauri, isLoading],
    )

    /**
     * Read file content directly by path (without dialog)
     */
    const readFile = useCallback(
        async (filePath: string): Promise<string | null> => {
            if (isLoading) return null

            if (!isTauri) {
                setError(
                    "File system operations are only available in desktop environment",
                )
                return null
            }

            try {
                setIsProcessing(true)
                setError(null)

                const content = await window.__TAURI__.invoke("read_file", {
                    filePath,
                })
                return content
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to read file"
                setError(errorMessage)
                console.error("Error reading file:", err)
                return null
            } finally {
                setIsProcessing(false)
            }
        },
        [isTauri, isLoading],
    )

    /**
     * Write file content directly by path (without dialog)
     */
    const writeFile = useCallback(
        async (filePath: string, content: string): Promise<boolean> => {
            if (isLoading) return false

            if (!isTauri) {
                setError(
                    "File system operations are only available in desktop environment",
                )
                return false
            }

            try {
                setIsProcessing(true)
                setError(null)

                await window.__TAURI__.invoke("write_file", {
                    filePath,
                    content,
                })

                return true
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Failed to write file"
                setError(errorMessage)
                console.error("Error writing file:", err)
                return false
            } finally {
                setIsProcessing(false)
            }
        },
        [isTauri, isLoading],
    )

    return {
        // State
        isProcessing,
        error,
        isAvailable: isTauri && !isLoading,

        // Functions
        openFile,
        saveFile,
        readFile,
        writeFile,

        // Utils
        clearError: () => setError(null),
    }
}

export default useFileSystem
