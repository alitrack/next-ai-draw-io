use genai::chat::ChatMessage;
use genai::Client;
use serde::{Deserialize, Serialize};
use std::env;

// AI Provider 枚举
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AIProvider {
    OpenAI,
    Anthropic,
    Gemini,
    Bedrock,
    Groq,
    DeepSeek,
    Ollama,
    Cohere,
}

impl AIProvider {
    pub fn from_string(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "openai" => Ok(Self::OpenAI),
            "anthropic" => Ok(Self::Anthropic),
            "gemini" | "google" => Ok(Self::Gemini),
            "bedrock" => Ok(Self::Bedrock),
            "groq" => Ok(Self::Groq),
            "deepseek" => Ok(Self::DeepSeek),
            "ollama" => Ok(Self::Ollama),
            "cohere" => Ok(Self::Cohere),
            _ => Err(format!("Unknown provider: {}", s)),
        }
    }

    pub fn to_genai_name(&self) -> &'static str {
        match self {
            Self::OpenAI => "openai",
            Self::Anthropic => "anthropic",
            Self::Gemini => "gemini",
            Self::Bedrock => "bedrock",
            Self::Groq => "groq",
            Self::DeepSeek => "deepseek",
            Self::Ollama => "ollama",
            Self::Cohere => "cohere",
        }
    }
}

// 聊天请求结构
#[derive(Debug, Deserialize)]
pub struct ChatRequestPayload {
    pub messages: Vec<UIMessage>,
    pub xml: Option<String>,
    pub previous_xml: Option<String>,
    pub session_id: Option<String>,
    pub access_code: Option<String>,
}

// UI 消息结构（兼容前端格式）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIMessage {
    pub role: String,
    pub parts: Vec<MessagePart>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum MessagePart {
    Text { text: String },
    File { url: String, media_type: Option<String> },
    #[serde(rename = "tool-call")]
    ToolCall {
        tool_call_id: String,
        tool_name: String,
        input: serde_json::Value,
    },
    #[serde(rename = "tool-result")]
    ToolResult {
        tool_call_id: String,
        tool_name: String,
        result: serde_json::Value,
    },
}

// 流式响应事件
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum StreamEvent {
    Start,
    TextDelta { delta: String },
    ToolCallStart { tool_call_id: String, tool_name: String },
    ToolInputDelta { tool_call_id: String, delta: String },
    ToolInputComplete { tool_call_id: String, tool_name: String, input: serde_json::Value },
    Finish { usage: Option<UsageStats> },
    Error { error: String },
}

#[derive(Debug, Clone, Serialize)]
pub struct UsageStats {
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub cached_input_tokens: Option<u32>,
}

// AI 配置
pub struct AIConfig {
    pub provider: AIProvider,
    pub model_id: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
}

impl AIConfig {
    pub fn from_env_and_overrides(
        provider_override: Option<String>,
        model_override: Option<String>,
        api_key_override: Option<String>,
        base_url_override: Option<String>,
    ) -> Result<Self, String> {
        // 优先使用 override，否则使用环境变量
        let provider_str = provider_override
            .or_else(|| env::var("AI_PROVIDER").ok())
            .ok_or_else(|| "AI_PROVIDER not configured".to_string())?;

        let provider = AIProvider::from_string(&provider_str)?;

        let model_id = model_override
            .or_else(|| env::var("AI_MODEL").ok())
            .ok_or_else(|| "AI_MODEL not configured".to_string())?;

        // 根据 provider 获取对应的 API key
        let api_key = api_key_override.or_else(|| match provider {
            AIProvider::OpenAI => env::var("OPENAI_API_KEY").ok(),
            AIProvider::Anthropic => env::var("ANTHROPIC_API_KEY").ok(),
            AIProvider::Gemini => env::var("GEMINI_API_KEY")
                .ok()
                .or_else(|| env::var("GOOGLE_GENERATIVE_AI_API_KEY").ok()),
            AIProvider::Groq => env::var("GROQ_API_KEY").ok(),
            AIProvider::DeepSeek => env::var("DEEPSEEK_API_KEY").ok(),
            AIProvider::Cohere => env::var("COHERE_API_KEY").ok(),
            AIProvider::Bedrock | AIProvider::Ollama => None,
        });

        let base_url = base_url_override.or_else(|| match provider {
            AIProvider::OpenAI => env::var("OPENAI_BASE_URL").ok(),
            AIProvider::Anthropic => env::var("ANTHROPIC_BASE_URL").ok(),
            AIProvider::DeepSeek => env::var("DEEPSEEK_BASE_URL").ok(),
            AIProvider::Ollama => env::var("OLLAMA_BASE_URL").ok(),
            _ => None,
        });

        Ok(Self {
            provider,
            model_id,
            api_key,
            base_url,
        })
    }
}

// 转换 UI 消息到 genai 消息格式
pub fn convert_ui_messages_to_genai(
    ui_messages: Vec<UIMessage>,
) -> Result<Vec<ChatMessage>, String> {
    let mut messages = Vec::new();

    for ui_msg in ui_messages {
        // 提取文本内容
        let mut text_parts = Vec::new();
        for part in &ui_msg.parts {
            match part {
                MessagePart::Text { text } => text_parts.push(text.clone()),
                _ => {} // 暂时忽略其他类型
            }
        }

        let content = text_parts.join("\n");

        let message = match ui_msg.role.as_str() {
            "user" => ChatMessage::user(content),
            "assistant" => ChatMessage::assistant(content),
            "system" => ChatMessage::system(content),
            _ => return Err(format!("Unknown role: {}", ui_msg.role)),
        };

        messages.push(message);
    }

    Ok(messages)
}

// 获取系统提示词
pub fn get_system_prompt(_model_id: &str, minimal_style: bool) -> String {
    // 这里先返回简化版本，后续可以完整实现
    let base_prompt = r#"You are an expert diagram creation assistant specializing in draw.io XML generation.
Your primary function is chat with user and crafting clear, well-organized visual diagrams through precise XML specifications.

When you are asked to create a diagram, briefly describe your plan about the layout and structure to avoid object overlapping or edge cross the objects. (2-3 sentences max), then use display_diagram tool to generate the XML.

You utilize the following tools:
- display_diagram: Display a NEW diagram on draw.io
- edit_diagram: Edit specific parts of the EXISTING diagram
- append_diagram: Continue generating diagram XML when display_diagram was truncated

IMPORTANT: Generate ONLY mxCell elements - NO wrapper tags (<mxfile>, <mxGraphModel>, <root>).
"#;

    if minimal_style {
        format!("## ⚠️ MINIMAL STYLE MODE ACTIVE ⚠️\n\n{}", base_prompt)
    } else {
        base_prompt.to_string()
    }
}

// 创建 genai Client
pub async fn create_client(config: &AIConfig) -> Result<Client, String> {
    let client = Client::default();

    // 配置 provider
    match &config.provider {
        AIProvider::OpenAI => {
            if let Some(api_key) = &config.api_key {
                println!("[DEBUG] Setting OPENAI_API_KEY: {}...", &api_key[..10.min(api_key.len())]);
                env::set_var("OPENAI_API_KEY", api_key);
            }
            if let Some(base_url) = &config.base_url {
                println!("[DEBUG] Setting OPENAI_BASE_URL: {}", base_url);
                env::set_var("OPENAI_BASE_URL", base_url);
            }
            // 验证环境变量是否设置成功
            println!("[DEBUG] OPENAI_API_KEY in env: {}", env::var("OPENAI_API_KEY").is_ok());
            println!("[DEBUG] OPENAI_BASE_URL in env: {:?}", env::var("OPENAI_BASE_URL").ok());
        }
        AIProvider::Anthropic => {
            if let Some(api_key) = &config.api_key {
                env::set_var("ANTHROPIC_API_KEY", api_key);
            }
        }
        AIProvider::Gemini => {
            if let Some(api_key) = &config.api_key {
                env::set_var("GEMINI_API_KEY", api_key);
            }
        }
        AIProvider::DeepSeek => {
            if let Some(api_key) = &config.api_key {
                env::set_var("DEEPSEEK_API_KEY", api_key);
            }
        }
        AIProvider::Groq => {
            if let Some(api_key) = &config.api_key {
                env::set_var("GROQ_API_KEY", api_key);
            }
        }
        _ => {}
    }

    Ok(client)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_conversion() {
        assert!(matches!(
            AIProvider::from_string("openai").unwrap(),
            AIProvider::OpenAI
        ));
        assert!(matches!(
            AIProvider::from_string("anthropic").unwrap(),
            AIProvider::Anthropic
        ));
    }
}
