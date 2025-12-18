"use client"

import type { UIMessage } from "ai"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { StreamEvent } from "./tauri-chat-types"
import { getTauriAPI, isTauriEnvironment } from "./tauri-env"

type ChatStatus = "submitted" | "streaming" | "ready" | "error"

type RustTextPart = { type: "text"; text: string }
type RustUIMessage = { role: string; parts: RustTextPart[] }
type RustChatRequestPayload = {
    messages: RustUIMessage[]
    xml?: string
    previous_xml?: string
    access_code?: string
    session_id?: string
}

interface UseTauriChatOptions {
    initialMessages?: UIMessage[]
    onToolCall?: (options: {
        toolCall: {
            toolCallId: string
            toolName: string
            input: Record<string, unknown>
        }
    }) => Promise<string | undefined>
}

interface UseTauriChatReturn {
    messages: UIMessage[]
    sendMessage: (
        message:
            | string
            | {
                  parts: Array<Record<string, unknown>>
              },
        options?: {
            body?: {
                xml?: string
                previousXml?: string
                sessionId?: string
                [key: string]: unknown
            }
            headers?: {
                "x-access-code"?: string
                "x-ai-provider"?: string
                "x-ai-model"?: string
                "x-ai-api-key"?: string
                "x-ai-base-url"?: string
                "x-minimal-style"?: string
                [key: string]: string | undefined
            }
        },
    ) => Promise<void>
    stop: () => void
    status: ChatStatus
    error: Error | null
    setMessages: (messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void
}

function getTextFromUIMessage(message: UIMessage): string {
    const textParts = message.parts
        .filter((p: any) => p?.type === "text" && typeof p.text === "string")
        .map((p: any) => p.text)
    return textParts.join("\n")
}

function toRustMessages(messages: UIMessage[]): RustUIMessage[] {
    return messages.map((m) => ({
        role: m.role,
        parts: [
            {
                type: "text",
                text: getTextFromUIMessage(m),
            },
        ],
    }))
}

export function useTauriChat(options: UseTauriChatOptions = {}): UseTauriChatReturn {
    const { initialMessages = [], onToolCall } = options

    const [messages, setMessages] = useState<UIMessage[]>(initialMessages)
    const [status, setStatus] = useState<ChatStatus>("ready")
    const [error, setError] = useState<Error | null>(null)

    const messagesRef = useRef(messages)
    useEffect(() => {
        messagesRef.current = messages
    }, [messages])

    const unlistenRef = useRef<(() => void) | null>(null)
    const shouldStopRef = useRef(false)
    const currentAssistantIdRef = useRef<string | null>(null)
    const handleStreamEventRef = useRef<((event: StreamEvent) => Promise<void>) | null>(null)

    const handleStreamEvent = useCallback(
        async (event: StreamEvent) => {
            if (shouldStopRef.current) return

            switch (event.type) {
                case "start": {
                    setStatus("streaming")
                    const assistantId = `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    currentAssistantIdRef.current = assistantId
                    setMessages((prev) => [
                        ...prev,
                        { id: assistantId, role: "assistant", parts: [] },
                    ])
                    break
                }

                case "text_delta": {
                    if (!event.delta) return
                    const delta = event.delta
                    setStatus("streaming")
                    const assistantId = currentAssistantIdRef.current
                    if (!assistantId) return

                    setMessages((prev) => {
                        const next = [...prev]
                        const idx = next.findIndex((m) => m.id === assistantId)
                        if (idx === -1) return prev

                        const msg = next[idx]
                        const parts = [...(msg.parts || [])]
                        const last = parts[parts.length - 1] as any

                        if (last?.type === "text") {
                            parts[parts.length - 1] = {
                                ...last,
                                text: `${last.text ?? ""}${delta}`,
                                state: "streaming",
                            }
                        } else {
                            parts.push({
                                type: "text",
                                text: delta,
                                state: "streaming",
                            })
                        }

                        next[idx] = { ...msg, parts }
                        return next
                    })
                    break
                }

                case "tool_call_start": {
                    setStatus("streaming")
                    const assistantId = currentAssistantIdRef.current
                    if (!assistantId || !event.tool_call_id || !event.tool_name) return
                    const toolCallId = event.tool_call_id
                    const toolName = event.tool_name

                    setMessages((prev) => {
                        const next = [...prev]
                        const idx = next.findIndex((m) => m.id === assistantId)
                        if (idx === -1) return prev

                        const msg = next[idx]
                        const parts = [...(msg.parts || [])]
                        
                        // 检查是否已存在相同的工具调用
                        const existingToolIdx = parts.findIndex(
                            (p: any) => p.toolCallId === toolCallId
                        )
                        
                        if (existingToolIdx === -1) {
                            // 只有不存在时才添加
                            parts.push({
                                type: `tool-${toolName}`,
                                toolCallId,
                                state: "input-streaming",
                                input: {},
                            })
                        }
                        
                        next[idx] = { ...msg, parts }
                        return next
                    })
                    break
                }

                case "tool_input_complete": {
                    setStatus("streaming")
                    const assistantId = currentAssistantIdRef.current
                    if (!assistantId || !event.tool_call_id || !event.tool_name) return
                    const toolCallId = event.tool_call_id
                    const toolName = event.tool_name

                    const input = (event.input ?? {}) as Record<string, unknown>

                    setMessages((prev) => {
                        const next = [...prev]
                        const idx = next.findIndex((m) => m.id === assistantId)
                        if (idx === -1) return prev

                        const msg = next[idx]
                        const parts = [...(msg.parts || [])]
                        const partIndex = parts.findIndex(
                            (p: any) => p?.toolCallId === toolCallId,
                        )
                        if (partIndex !== -1) {
                            parts[partIndex] = {
                                ...(parts[partIndex] as any),
                                state: "input-available",
                                input,
                            }
                        }
                        next[idx] = { ...msg, parts }
                        return next
                    })

                    if (onToolCall) {
                        try {
                            const output = await onToolCall({
                                toolCall: {
                                    toolCallId,
                                    toolName,
                                    input,
                                },
                            })

                            setMessages((prev) => {
                                const next = [...prev]
                                const idx = next.findIndex((m) => m.id === assistantId)
                                if (idx === -1) return prev

                                const msg = next[idx]
                                const parts = [...(msg.parts || [])]
                                const partIndex = parts.findIndex(
                                    (p: any) => p?.toolCallId === toolCallId,
                                )
                                if (partIndex !== -1) {
                                    parts[partIndex] = {
                                        ...(parts[partIndex] as any),
                                        state: "output-available",
                                        output: output || "success",
                                    }
                                }
                                next[idx] = { ...msg, parts }
                                return next
                            })
                        } catch (err) {
                            const errMsg = err instanceof Error ? err.message : String(err)
                            setMessages((prev) => {
                                const next = [...prev]
                                const idx = next.findIndex((m) => m.id === assistantId)
                                if (idx === -1) return prev

                                const msg = next[idx]
                                const parts = [...(msg.parts || [])]
                                const partIndex = parts.findIndex(
                                    (p: any) => p?.toolCallId === toolCallId,
                                )
                                if (partIndex !== -1) {
                                    parts[partIndex] = {
                                        ...(parts[partIndex] as any),
                                        state: "output-error",
                                        output: errMsg,
                                    }
                                }
                                next[idx] = { ...msg, parts }
                                return next
                            })
                        }
                    }

                    break
                }

                case "finish": {
                    setStatus("ready")
                    currentAssistantIdRef.current = null
                    // Mark last assistant text as done (optional)
                    setMessages((prev) =>
                        prev.map((m) => {
                            if (m.role !== "assistant") return m
                            const parts = (m.parts || []).map((p: any) =>
                                p?.type === "text" ? { ...p, state: "done" } : p,
                            )
                            return { ...m, parts }
                        }),
                    )
                    break
                }

                case "error": {
                    const err = new Error(event.error || "Unknown error")
                    setError(err)
                    setStatus("error")
                    currentAssistantIdRef.current = null
                    break
                }

                default:
                    break
            }
        },
        [onToolCall],
    )
    
    // 更新ref
    handleStreamEventRef.current = handleStreamEvent

    useEffect(() => {
        if (!isTauriEnvironment()) return
        const tauri = getTauriAPI()
        if (!tauri?.event?.listen) return

        tauri.event
            .listen("chat-stream", (event: any) => {
                handleStreamEventRef.current?.(event.payload as StreamEvent)
            })
            .then((unlisten: () => void) => {
                unlistenRef.current = unlisten
            })

        return () => {
            if (unlistenRef.current) {
                unlistenRef.current()
                unlistenRef.current = null
            }
        }
    }, [])

    const sendMessage = useCallback<
        UseTauriChatReturn["sendMessage"]
    >(async (message, options = {}) => {
        if (!isTauriEnvironment()) {
            throw new Error("Not in Tauri environment")
        }

        const tauri = getTauriAPI()
        if (!tauri?.invoke) {
            throw new Error("Tauri invoke API not available")
        }

        shouldStopRef.current = false
        setStatus("submitted")
        setError(null)

        const userMessage: UIMessage =
            typeof message === "string"
                ? {
                      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      role: "user",
                      parts: [{ type: "text", text: message }],
                  }
                : {
                      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      role: "user",
                      parts: (message.parts as any[]) || [],
                  }

        setMessages((prev) => [...prev, userMessage])

        const providerOverride = options.headers?.["x-ai-provider"]
        const modelOverride = options.headers?.["x-ai-model"]
        const apiKeyOverride = options.headers?.["x-ai-api-key"]
        const baseUrlOverride = options.headers?.["x-ai-base-url"]
        const minimalStyle = options.headers?.["x-minimal-style"] === "true"

        const payload: RustChatRequestPayload = {
            messages: toRustMessages([...messagesRef.current, userMessage]),
            xml: options.body?.xml,
            previous_xml: options.body?.previousXml,
            access_code: options.headers?.["x-access-code"],
            session_id: options.body?.sessionId,
        }

        await tauri.invoke("chat_stream", {
            payload: JSON.stringify(payload),
            providerOverride: providerOverride || null,
            modelOverride: modelOverride || null,
            apiKeyOverride: apiKeyOverride || null,
            baseUrlOverride: baseUrlOverride || null,
            minimalStyle: minimalStyle || false,
        })
    }, [])

    const stop = useCallback(() => {
        shouldStopRef.current = true
        setStatus("ready")
        currentAssistantIdRef.current = null
    }, [])

    return useMemo(
        () => ({
            messages,
            sendMessage,
            stop,
            status,
            error,
            setMessages,
        }),
        [messages, sendMessage, stop, status, error],
    )
}
