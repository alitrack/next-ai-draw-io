# Tauri Chat 快速开始指南

## 🎉 完成的工作

我已经完成了 Tauri 后端的 Rust chat stream 实现和前端集成：

### 后端 (Rust)
- ✅ rust-genai 集成（支持多个 AI 提供商）
- ✅ chat_stream Tauri command
- ✅ 流式响应处理
- ✅ 工具调用支持（display_diagram, edit_diagram, append_diagram）
- ✅ 配置覆盖（provider, model, API key, base URL）
- ✅ 访问码验证

### 前端 (TypeScript/React)
- ✅ TypeScript 类型定义（lib/tauri-chat-types.ts）
- ✅ 环境检测工具（lib/tauri-env.ts）
- ✅ useTauriChat Hook（lib/use-tauri-chat.ts）
- ✅ 测试页面（app/tauri-test/page.tsx）

## 🧪 如何测试

### 1. 配置环境变量

在项目根目录创建或修改 `.env.local` 文件：

```bash
# AI Provider 配置
AI_PROVIDER=openai          # 或 anthropic, gemini, deepseek, groq, ollama
AI_MODEL=gpt-4o            # 模型名称

# API Key
OPENAI_API_KEY=sk-...      # 根据你选择的 provider 配置相应的 key
# ANTHROPIC_API_KEY=sk-ant-...
# GEMINI_API_KEY=...

# 可选配置
# ACCESS_CODE_LIST=test123,test456
# OPENAI_BASE_URL=https://api.openai.com/v1
```

### 2. 启动 Tauri 开发模式

```bash
npm run tauri:dev
```

这会：
1. 启动 Next.js 开发服务器（port 6002）
2. 启动 Tauri 桌面应用
3. 自动打开测试页面

### 3. 访问测试页面

Tauri 应用启动后，在地址栏输入：

```
http://localhost:6002/tauri-test
```

或者在主应用中导航到测试页面。

### 4. 测试基本功能

在测试页面：

1. **环境检测**：页面应显示 "✓ Running in Tauri environment"
2. **简单消息**：尝试发送 "Hello"，应收到 AI 回复
3. **工具调用**：尝试 "Create a simple flowchart"，应触发 display_diagram 工具

### 5. 查看日志

打开浏览器开发者工具（F12）查看详细日志：
- `[useTauriChat]` - Hook 相关日志
- `[Test]` - 测试页面日志
- Tauri 后端日志会显示在启动 tauri:dev 的终端中

## 🐛 故障排除

### 问题 1：显示 "Not running in Tauri environment"

**原因**：使用浏览器直接访问，而不是通过 Tauri 应用

**解决**：
```bash
npm run tauri:dev
```
确保使用 Tauri 应用访问，不要在浏览器中直接打开 localhost:6002

### 问题 2："Tauri invoke API not available"

**原因**：Tauri API 未正确初始化

**解决**：
1. 重启 Tauri 应用
2. 检查 `src-tauri/tauri.conf.json` 中的配置
3. 确保 `chat_stream` command 已在 `src-tauri/src/lib.rs` 中注册

### 问题 3："Invalid or missing access code"

**原因**：配置了 ACCESS_CODE_LIST 但没有提供访问码

**解决**：
- 方案 A：移除 `.env.local` 中的 `ACCESS_CODE_LIST`
- 方案 B：在测试页面代码中添加 access_code

### 问题 4：AI 响应错误

**原因**：AI provider 配置错误或 API key 无效

**解决**：
1. 检查 `.env.local` 中的配置
2. 确认 API key 有效
3. 检查网络连接
4. 查看 Rust 后端日志了解详细错误

### 问题 5：Rust 编译错误

**解决**：
```bash
cd src-tauri
cargo check
```

如果有错误，查看错误信息并修复。

## 📊 测试检查清单

- [ ] 环境检测正常（显示绿色提示）
- [ ] 可以发送简单文本消息
- [ ] AI 返回流式响应
- [ ] 工具调用正常工作（display_diagram）
- [ ] 错误处理正常
- [ ] 消息历史保持正确
- [ ] 停止按钮功能正常

## 🚀 下一步

测试成功后，可以：

1. **集成到主应用**：
   - 修改 `components/chat-panel.tsx` 使用 `useTauriChat`
   - 添加环境检测，在 Tauri 中使用 Rust 后端，在 Web 中使用 Next.js API

2. **添加更多功能**：
   - 图像上传支持
   - PDF 处理
   - 历史记录持久化
   - 更多 AI 提供商

3. **优化性能**：
   - 流式响应优化
   - 错误重试逻辑
   - 本地缓存

## 📚 相关文档

- [Rust Chat Integration Guide](./RUST_CHAT_INTEGRATION.md) - 完整集成文档
- [Tauri Build Guide](./TAURI_BUILD_GUIDE.md) - Tauri 构建指南
- [项目 CLAUDE.md](../CLAUDE.md) - 项目总览

## 💡 提示

- 测试时打开开发者工具查看详细日志
- Rust 后端日志在启动 tauri:dev 的终端中
- 可以通过修改 `.env.local` 切换不同的 AI 提供商
- 支持的提供商：OpenAI, Anthropic, Gemini, DeepSeek, Groq, Ollama, Cohere

## 🎯 测试目标

本次测试的主要目标是验证：

1. ✅ Rust 后端可以正常调用 AI API
2. ✅ 流式响应可以正确传递到前端
3. ✅ 工具调用机制工作正常
4. ✅ 错误处理健壮
5. ✅ 与现有功能兼容

测试成功后，我们就可以在主应用中全面启用 Tauri 后端！
