use crate::ai_chat::{get_system_prompt, AIConfig, ChatRequestPayload, StreamEvent, UsageStats};
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::json;
use tauri::{Emitter, Window};

// 创建工具定义（OpenAI格式）
fn create_tools() -> Vec<serde_json::Value> {
    vec![
        json!({
            "type": "function",
            "function": {
                "name": "display_diagram",
                "description": "Display a diagram on draw.io. Pass ONLY the mxCell elements - wrapper tags and root cells are added automatically.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "xml": {
                            "type": "string",
                            "description": "XML string to be displayed on draw.io"
                        }
                    },
                    "required": ["xml"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "edit_diagram",
                "description": "Edit the current diagram by ID-based operations (update/add/delete cells).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "operations": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "enum": ["update", "add", "delete"]
                                    },
                                    "cell_id": {
                                        "type": "string"
                                    },
                                    "new_xml": {
                                        "type": "string"
                                    }
                                },
                                "required": ["type", "cell_id"]
                            }
                        }
                    },
                    "required": ["operations"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "append_diagram",
                "description": "Continue generating diagram XML when previous display_diagram output was truncated.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "xml": {
                            "type": "string"
                        }
                    },
                    "required": ["xml"]
                }
            }
        }),
    ]
}

#[tauri::command]
pub async fn chat_stream(
    window: Window,
    payload: String,
    provider_override: Option<String>,
    model_override: Option<String>,
    api_key_override: Option<String>,
    base_url_override: Option<String>,
    minimal_style: Option<bool>,
) -> Result<(), String> {
    // 解析请求
    let request: ChatRequestPayload =
        serde_json::from_str(&payload).map_err(|e| format!("Invalid request: {}", e))?;

    // 验证 access code
    if let Ok(access_codes_str) = std::env::var("ACCESS_CODE_LIST") {
        let access_codes: Vec<String> = access_codes_str
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        if !access_codes.is_empty() {
            let provided_code = request.access_code.unwrap_or_default();
            if !access_codes.contains(&provided_code) {
                return Err("Invalid or missing access code".to_string());
            }
        }
    }

    // 获取配置
    let config = AIConfig::from_env_and_overrides(
        provider_override,
        model_override,
        api_key_override,
        base_url_override,
    )?;

    // 获取API密钥和base URL
    let api_key = config.api_key.ok_or_else(|| {
        format!("{:?} API key not configured", config.provider)
    })?;
    
    let base_url = config.base_url.unwrap_or_else(|| {
        match config.provider {
            crate::ai_chat::AIProvider::OpenAI => "https://api.openai.com/v1".to_string(),
            crate::ai_chat::AIProvider::Anthropic => "https://api.anthropic.com/v1".to_string(),
            crate::ai_chat::AIProvider::DeepSeek => "https://api.deepseek.com/v1".to_string(),
            _ => "https://api.openai.com/v1".to_string(), // 默认使用OpenAI兼容格式
        }
    });

    // 构建系统消息
    let system_prompt = get_system_prompt(&config.model_id, minimal_style.unwrap_or(false));

    // 构建 XML 上下文
    let xml_context = if let Some(xml) = &request.xml {
        let previous_xml_part = if let Some(prev_xml) = &request.previous_xml {
            format!("Previous diagram XML:\n```xml\n{}\n```\n\n", prev_xml)
        } else {
            String::new()
        };
        format!("{}Current diagram XML:\n```xml\n{}\n```", previous_xml_part, xml)
    } else {
        String::new()
    };

    // 构建消息
    let mut messages = vec![json!({"role": "system", "content": system_prompt})];
    if !xml_context.is_empty() {
        messages.push(json!({"role": "system", "content": xml_context}));
    }

    for msg in request.messages {
        let content = msg
            .parts
            .iter()
            .filter_map(|part| {
                if let crate::ai_chat::MessagePart::Text { text } = part {
                    Some(text.clone())
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
            .join("\n");

        messages.push(json!({"role": msg.role, "content": content}));
    }

    // 发送开始事件
    window
        .emit("chat-stream", StreamEvent::Start)
        .map_err(|e| format!("Failed to emit start: {}", e))?;

    // 创建HTTP客户端并发送请求
    let client = Client::new();
    let tools = create_tools();
    let request_body = json!({
        "model": config.model_id,
        "messages": messages,
        "tools": tools,
        "stream": true
    });

    let url = format!("{}/chat/completions", base_url);
    println!("[DEBUG] Sending request to: {}", url);
    
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, error_text));
    }

    // 处理SSE流
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    
    // 跟踪工具调用的参数累积
    let mut tool_call_args: std::collections::HashMap<String, (String, String)> = std::collections::HashMap::new();

    let mut chunk_count = 0;
    while let Some(chunk) = stream.next().await {
        chunk_count += 1;
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        // 处理SSE行 - 按单个\n分割
        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();

            if line.is_empty() || line == "data: [DONE]" {
                continue;
            }

            if let Some(data) = line.strip_prefix("data: ") {
                if let Ok(json_data) = serde_json::from_str::<serde_json::Value>(data) {
                    // 处理delta - 使用安全的get方法
                    if let Some(choices) = json_data.get("choices").and_then(|v| v.as_array()) {
                        if let Some(choice) = choices.first() {
                            if let Some(delta) = choice.get("delta").and_then(|v| v.as_object()) {
                                // 文本内容
                                if let Some(content) = delta.get("content").and_then(|v| v.as_str()) {
                                    if !content.is_empty() {
                                        window.emit("chat-stream", StreamEvent::TextDelta {
                                            delta: content.to_string(),
                                        }).ok();
                                    }
                                }

                                // 工具调用
                                if let Some(tool_calls) = delta.get("tool_calls").and_then(|v| v.as_array()) {
                                    for tool_call in tool_calls {
                                        if let Some(id) = tool_call.get("id").and_then(|v| v.as_str()) {
                                            if let Some(function) = tool_call.get("function").and_then(|v| v.as_object()) {
                                                if let Some(name) = function.get("name").and_then(|v| v.as_str()) {
                                                    // 初始化工具调用记录
                                                    tool_call_args.entry(id.to_string())
                                                        .or_insert((name.to_string(), String::new()));
                                                    
                                                    window
                                                        .emit("chat-stream", StreamEvent::ToolCallStart {
                                                            tool_call_id: id.to_string(),
                                                            tool_name: name.to_string(),
                                                        })
                                                        .ok();
                                                }
                                                if let Some(args) = function.get("arguments").and_then(|v| v.as_str()) {
                                                    // 累积参数
                                                    if let Some((_, accumulated_args)) = tool_call_args.get_mut(id) {
                                                        accumulated_args.push_str(args);
                                                    }
                                                    
                                                    window
                                                        .emit("chat-stream", StreamEvent::ToolInputDelta {
                                                            tool_call_id: id.to_string(),
                                                            delta: args.to_string(),
                                                        })
                                                        .ok();
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // 检查是否完成
                            if let Some(finish_reason) = choice.get("finish_reason").and_then(|v| v.as_str()) {
                                if finish_reason == "stop" || finish_reason == "tool_calls" {
                                    // 发送所有工具调用的complete事件
                                    for (tool_call_id, (tool_name, args_str)) in &tool_call_args {
                                        if let Ok(input_json) = serde_json::from_str::<serde_json::Value>(args_str) {
                                            window
                                                .emit("chat-stream", StreamEvent::ToolInputComplete {
                                                    tool_call_id: tool_call_id.clone(),
                                                    tool_name: tool_name.clone(),
                                                    input: input_json,
                                                })
                                                .ok();
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 发送完成事件
    window
        .emit("chat-stream", StreamEvent::Finish { usage: None })
        .map_err(|e| format!("Failed to emit finish: {}", e))?;

    Ok(())
}
