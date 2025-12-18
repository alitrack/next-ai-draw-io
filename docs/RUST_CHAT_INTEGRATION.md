# Rust Chat Stream 集成指南

本文档说明如何在前端使用 Tauri 实现的 Rust chat stream 功能。

## 概述

我们已经在 Tauri 后端实现了完整的 AI chat stream 功能，使用 `rust-genai` 库支持多个 AI 提供商，包括工具调用（tool calling）支持。

## 架构

```
前端 (React/Next.js)
    ↓ (调用 Tauri command)
Tauri Backend (Rust)
    ↓ (使用 rust-genai)
AI Provider (OpenAI, Anthropic, etc.)
```

## Tauri Command

### 函数签名

```rust
#[tauri::command]
pub async fn chat_stream(
    window: Window,
    payload: String,                      // JSON 格式的请求
    provider_override: Option<String>,    // 可选的 provider 覆盖
    model_override: Option<String>,       // 可选的 model 覆盖
    api_key_override: Option<String>,     // 可选的 API key 覆盖
    base_url_override: Option<String>,    // 可选的 base URL 覆盖
    minimal_style: Option<bool>,          // 是否使用最小化样式
) -> Result<(), String>
```

### 请求格式 (payload)

```typescript
interface ChatRequestPayload {
  messages: UIMessage[];
  xml?: string;                // 当前图表 XML
  previous_xml?: string;       // 之前的图表 XML
  access_code?: string;        // 访问码（如果需要）
  session_id?: string;         // 会话 ID（可选）
}

interface UIMessage {
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];
}

interface MessagePart {
  text?: string;
  // 其他类型的 part 可以在这里添加
}
```

### 流式事件

通过 Tauri 的事件系统接收流式响应：

```typescript
// 监听 chat-stream 事件
window.__TAURI__.event.listen('chat-stream', (event) => {
  const data = event.payload;

  switch (data.type) {
    case 'start':
      // 流开始
      console.log('Stream started');
      break;

    case 'text_delta':
      // 接收文本增量
      console.log('Text delta:', data.delta);
      break;

    case 'tool_call_start':
      // 工具调用开始
      console.log('Tool call started:', data.tool_name);
      break;

    case 'tool_input_delta':
      // 工具输入增量
      console.log('Tool input delta:', data.delta);
      break;

    case 'tool_input_complete':
      // 工具输入完成
      console.log('Tool call complete:', data.tool_name, data.input);
      break;

    case 'finish':
      // 流结束
      console.log('Stream finished');
      if (data.usage) {
        console.log('Usage:', data.usage);
      }
      break;

    case 'error':
      // 错误
      console.error('Stream error:', data.error);
      break;
  }
});
```

## 前端集成示例

### TypeScript 类型定义

```typescript
// types/tauri-chat.ts

export type StreamEventType =
  | 'start'
  | 'text_delta'
  | 'tool_call_start'
  | 'tool_input_delta'
  | 'tool_input_complete'
  | 'finish'
  | 'error';

export interface StreamEvent {
  type: StreamEventType;
  delta?: string;
  tool_call_id?: string;
  tool_name?: string;
  input?: any;
  usage?: UsageStats;
  error?: string;
}

export interface UsageStats {
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens?: number;
}
```

### React Hook 示例

```typescript
// hooks/use-tauri-chat.ts

import { useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

export function useTauriChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 监听流式事件
    const unlisten = listen('chat-stream', (event) => {
      const data = event.payload as StreamEvent;

      switch (data.type) {
        case 'start':
          setIsStreaming(true);
          setError(null);
          break;

        case 'text_delta':
          // 处理文本增量
          onTextDelta?.(data.delta!);
          break;

        case 'tool_call_start':
          // 处理工具调用开始
          onToolCallStart?.(data.tool_call_id!, data.tool_name!);
          break;

        case 'tool_input_complete':
          // 处理工具调用完成
          onToolCallComplete?.(data.tool_name!, data.input!);
          break;

        case 'finish':
          setIsStreaming(false);
          onFinish?.(data.usage);
          break;

        case 'error':
          setIsStreaming(false);
          setError(data.error!);
          onError?.(data.error!);
          break;
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const sendMessage = useCallback(async (
    messages: UIMessage[],
    xml?: string,
    previousXml?: string,
    accessCode?: string
  ) => {
    try {
      const payload = JSON.stringify({
        messages,
        xml,
        previous_xml: previousXml,
        access_code: accessCode,
      });

      await invoke('chat_stream', {
        payload,
        providerOverride: null,
        modelOverride: null,
        apiKeyOverride: null,
        baseUrlOverride: null,
        minimalStyle: false,
      });
    } catch (err) {
      setError(err as string);
      onError?.(err as string);
    }
  }, []);

  return {
    sendMessage,
    isStreaming,
    error,
  };
}
```

## 环境变量配置

在 `.env` 或 `.env.local` 文件中配置：

```bash
# AI Provider 配置
AI_PROVIDER=openai          # openai, anthropic, gemini, deepseek, groq, ollama, cohere
AI_MODEL=gpt-4o            # 模型名称

# API Keys (根据 provider 选择)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...
GROQ_API_KEY=...

# 可选配置
OPENAI_BASE_URL=https://api.openai.com/v1  # 自定义 base URL
ACCESS_CODE_LIST=code1,code2,code3         # 访问码列表（逗号分隔）
```

## 支持的 AI 提供商

- **OpenAI**: GPT-4, GPT-4o, GPT-3.5-turbo 等
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus, Haiku 等
- **Google Gemini**: Gemini 2.0 Flash, Gemini 1.5 Pro 等
- **DeepSeek**: DeepSeek V3, DeepSeek Chat 等
- **Groq**: Llama 3, Mixtral 等
- **Ollama**: 本地部署的模型
- **Cohere**: Command R 等

## 工具定义

系统支持以下工具：

1. **display_diagram**: 生成新的 draw.io 图表
   ```json
   {
     "xml": "mxCell XML 内容..."
   }
   ```

2. **edit_diagram**: 编辑现有图表
   ```json
   {
     "operations": [
       {
         "type": "update",
         "cell_id": "2",
         "new_xml": "<mxCell ...>"
       }
     ]
   }
   ```

3. **append_diagram**: 继续生成被截断的图表
   ```json
   {
     "xml": "继续的 XML 内容..."
   }
   ```

## 错误处理

```typescript
try {
  await invoke('chat_stream', { payload, ... });
} catch (error) {
  if (error.includes('Invalid or missing access code')) {
    // 处理访问码错误
  } else if (error.includes('Unknown provider')) {
    // 处理 provider 错误
  } else {
    // 其他错误
  }
}
```

## 性能优化建议

1. **使用 Rust 后端的优势**：
   - 更快的流式处理
   - 更低的内存占用
   - 原生性能，无需 Node.js 运行时

2. **流式处理**：
   - 使用事件监听器处理增量更新
   - 避免在每个事件中进行重型计算

3. **工具调用**：
   - 累积工具输入增量，在 `tool_input_complete` 事件时一次性处理
   - 使用适当的防抖策略避免频繁的 UI 更新

## 迁移指南

如果你现在使用的是 Next.js API route (`/api/chat`)，可以按以下步骤迁移到 Tauri：

1. **检测环境**：
   ```typescript
   const isTauri = typeof window !== 'undefined' &&
                   window.__TAURI__ !== undefined;
   ```

2. **条件调用**：
   ```typescript
   if (isTauri) {
     // 使用 Tauri command
     await invoke('chat_stream', { ... });
   } else {
     // 使用 Next.js API route
     await fetch('/api/chat', { ... });
   }
   ```

3. **统一接口**：
   创建一个抽象层来处理两种方式，确保相同的 API 接口。

## 调试

1. **启用 Rust 日志**：
   ```bash
   RUST_LOG=debug npm run tauri:dev
   ```

2. **查看 Tauri 日志**：
   在开发模式下，Rust 日志会输出到终端。

3. **前端调试**：
   使用浏览器开发者工具监听 `chat-stream` 事件。

## 下一步

- [ ] 在前端实现事件监听器
- [ ] 添加错误处理和重试逻辑
- [ ] 实现 BYOK (Bring Your Own Key) 功能
- [ ] 添加流式响应的取消功能
- [ ] 实现离线模式支持（Ollama）

## 参考资料

- [Tauri IPC 文档](https://tauri.app/v1/guides/features/command)
- [rust-genai 库文档](https://docs.rs/genai/)
- [项目 CLAUDE.md](../CLAUDE.md)
