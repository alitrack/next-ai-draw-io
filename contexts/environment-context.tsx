// Environment Context Provider
// 用于在整个应用中共享环境信息
"use client"

import React, { createContext, type ReactNode, useContext } from "react"
import useEnvironment from "../hooks/useEnvironment"

type EnvironmentContextType = ReturnType<typeof useEnvironment>

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(
    undefined,
)

export function EnvironmentProvider({ children }: { children: ReactNode }) {
    const environment = useEnvironment()

    return (
        <EnvironmentContext.Provider value={environment}>
            {children}
        </EnvironmentContext.Provider>
    )
}

export function useEnvironmentContext() {
    const context = useContext(EnvironmentContext)
    if (context === undefined) {
        throw new Error(
            "useEnvironmentContext must be used within an EnvironmentProvider",
        )
    }
    return context
}
