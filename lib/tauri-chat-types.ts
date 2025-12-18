/**
 * Tauri Chat Stream 类型定义
 * 与 Rust 后端的流式事件类型匹配
 */

// 流式事件类型
export type StreamEventType =
    | "start"
    | "text_delta"
    | "tool_call_start"
    | "tool_input_delta"
    | "tool_input_complete"
    | "finish"
    | "error"

// 使用统计
export interface UsageStats {
    input_tokens: number
    output_tokens: number
    cached_input_tokens?: number
}

// 流式事件
export interface StreamEvent {
    type: StreamEventType
    delta?: string
    tool_call_id?: string
    tool_name?: string
    input?: Record<string, unknown>
    usage?: UsageStats
    error?: string
}

// UI 消息部分
export interface UIMessagePart {
    text?: string
    image?: string
    // 其他类型可以在这里添加
}

// UI 消息
export interface UIMessage {
    role: "user" | "assistant" | "system"
    parts: UIMessagePart[]
}

// 聊天请求负载
export interface ChatRequestPayload {
    messages: UIMessage[]
    xml?: string
    previous_xml?: string
    access_code?: string
    session_id?: string
}

// Tauri Chat 配置
export interface TauriChatConfig {
    provider_override?: string
    model_override?: string
    api_key_override?: string
    base_url_override?: string
    minimal_style?: boolean
}

// 工具调用状态
export interface ToolCallState {
    toolCallId: string
    toolName: string
    input: string // 累积的 JSON 字符串
    isComplete: boolean
}
