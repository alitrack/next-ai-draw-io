"use client"

import { useState } from "react"
import { isTauriEnvironment } from "@/lib/tauri-env"
import { useTauriChat } from "@/lib/use-tauri-chat"

/**
 * Tauri Chat 测试页面
 *
 * 用于测试 Tauri 后端集成是否正常工作
 */
export default function TauriChatTest() {
    const isTauri = isTauriEnvironment()
    const [input, setInput] = useState("")

    const { messages, sendMessage, status, error } = useTauriChat({
        onToolCall: async ({ toolCall }) => {
            console.log("[Test] Tool call:", toolCall.toolName, toolCall.input)
            return "Tool output received"
        },
    })

    const getText = (msg: any) =>
        (msg.parts || [])
            .filter((p: any) => p?.type === "text" && typeof p.text === "string")
            .map((p: any) => p.text)
            .join("\n")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim()) return

        try {
            await sendMessage(
                { parts: [{ type: "text", text: input }] },
                {
                    body: {},
                    headers: {},
                },
            )
            setInput("")
        } catch (err) {
            console.error("[Test] Send message error:", err)
        }
    }

    if (!isTauri) {
        return (
            <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
                <h1>Tauri Chat Test</h1>
                <p style={{ color: "red" }}>
                    ⚠️ Not running in Tauri environment. This test page only works in
                    Tauri desktop app.
                </p>
                <p>
                    To test:
                    <code style={{ display: "block", padding: "10px", background: "#f5f5f5", margin: "10px 0" }}>
                        npm run tauri:dev
                    </code>
                </p>
            </div>
        )
    }

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
            <h1>Tauri Chat Test</h1>
            <p style={{ color: "green" }}>✓ Running in Tauri environment</p>

            <div
                style={{
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "20px",
                    maxHeight: "400px",
                    overflowY: "auto",
                    background: "#f9f9f9",
                }}
            >
                <h3>Messages:</h3>
                {messages.length === 0 ? (
                    <p style={{ color: "#999" }}>No messages yet. Try sending one!</p>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            style={{
                                padding: "10px",
                                marginBottom: "10px",
                                background: msg.role === "user" ? "#e3f2fd" : "#fff",
                                borderRadius: "4px",
                                border: "1px solid #ddd",
                            }}
                        >
                            <strong>{msg.role}:</strong> {getText(msg)}
                            {msg.parts && msg.parts.length > 0 && (
                                <div style={{ marginTop: "8px", fontSize: "0.9em" }}>
                                    <strong>Parts:</strong>
                                    {msg.parts.map((part, idx) => (
                                        <div key={idx} style={{ marginLeft: "10px" }}>
                                            - {part.type}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {error && (
                <div
                    style={{
                        padding: "16px",
                        marginBottom: "20px",
                        background: "#ffebee",
                        border: "1px solid #f44336",
                        borderRadius: "8px",
                        color: "#c62828",
                    }}
                >
                    <strong>Error:</strong> {error.message}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", gap: "10px" }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    disabled={status === "submitted" || status === "streaming"}
                    style={{
                        flex: 1,
                        padding: "12px",
                        fontSize: "16px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                    }}
                />
                <button
                    type="submit"
                    disabled={(status === "submitted" || status === "streaming") || !input.trim()}
                    style={{
                        padding: "12px 24px",
                        fontSize: "16px",
                        background:
                            status === "submitted" || status === "streaming"
                                ? "#ccc"
                                : "#2196f3",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor:
                            status === "submitted" ||
                            status === "streaming" ||
                            !input.trim()
                                ? "not-allowed"
                                : "pointer",
                    }}
                >
                    {status === "submitted" || status === "streaming"
                        ? "Sending..."
                        : "Send"}
                </button>
            </form>

            <div style={{ marginTop: "20px", padding: "16px", background: "#f5f5f5", borderRadius: "8px" }}>
                <h3>Status:</h3>
                <p>
                    <strong>Status:</strong> {status}
                </p>
                <p>
                    <strong>Message Count:</strong> {messages.length}
                </p>
            </div>

            <div style={{ marginTop: "20px", padding: "16px", background: "#fff3cd", borderRadius: "8px" }}>
                <h3>Instructions:</h3>
                <ol>
                    <li>Make sure you have configured AI provider in <code>.env</code></li>
                    <li>Try sending a simple message like "Hello"</li>
                    <li>Try asking for a diagram: "Create a simple flowchart"</li>
                    <li>Check browser console for detailed logs</li>
                </ol>
            </div>
        </div>
    )
}
