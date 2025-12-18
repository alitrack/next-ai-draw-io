# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next AI Draw.io is a Next.js web application that combines AI capabilities with draw.io diagram creation. Users can create, modify, and enhance diagrams through natural language commands. The application supports multiple AI providers (OpenAI, Anthropic, Google, Azure, AWS Bedrock, Ollama, OpenRouter, DeepSeek, SiliconFlow) and includes a Tauri-based desktop version.

## Development Commands

### Web Application
```bash
npm run dev          # Start dev server on port 6002 with Turbopack
npm run build        # Build production bundle
npm start            # Start production server on port 6001
npm run lint         # Run Biome linter
npm run format       # Auto-format code with Biome
npm run check        # Run all Biome checks (used in CI)
```

### Tauri Desktop Application
```bash
npm run tauri:dev    # Run desktop app in development mode
npm run tauri:build  # Build desktop application installer
```

⚠️ **注意**：Tauri 构建需要 Rust 工具链。详见 `docs/TAURI_BUILD_GUIDE.md`。

### Docker
```bash
docker run -d -p 3000:3000 --env-file .env ghcr.io/dayuanjiang/next-ai-draw-io:latest
```

## Code Style & Linting

- **Biome** is used for linting and formatting (NOT ESLint/Prettier)
- Pre-commit hooks via Husky automatically run Biome on staged files
- Indent: 4 spaces, semicolons: asNeeded, quotes: double
- UI components in `components/ui/` have linting/formatting disabled
- Install the Biome VS Code extension for real-time linting

## Architecture Overview

### Core Technologies
- **Next.js 16** (App Router) - Frontend framework with standalone output
- **React 19** - UI library
- **Vercel AI SDK** - Multi-provider AI streaming and tool calling
- **react-drawio** - Draw.io diagram embedding and manipulation
- **Tauri 2** - Desktop application wrapper (Rust + web frontend)
  - 开发模式：连接到 Next.js dev server (port 6002)
  - 生产模式：启动内嵌的 Next.js standalone server (port 3000)
- **Langfuse** - Telemetry and tracing (optional)

### Key Architectural Patterns

#### AI Tool-Based Architecture
The application uses AI function calling with three primary tools:
1. `display_diagram` - Generate new diagrams (outputs draw.io XML)
2. `edit_diagram` - Modify existing diagrams (search/replace on XML)
3. `append_diagram` - Continue truncated diagram generation

Tool definitions are in `app/api/chat/route.ts` with system prompts in `lib/system-prompts.ts`.

#### Diagram State Management
- **DiagramContext** (`contexts/diagram-context.tsx`) - Global state for diagram XML/SVG
- **react-drawio** - Embedded draw.io editor for rendering and user interaction
- Diagrams are stored as XML that draw.io can render
- History tracking (max 20 versions) for undo/restore functionality
- XML validation and auto-repair with `validateAndFixXml()` in `lib/utils.ts`

#### AI Provider Abstraction
- `lib/ai-providers.ts` - Provider factory with environment-based configuration
- `lib/ai-config.ts` - Provider-specific options (reasoning, thinking budgets, etc.)
- Client-side overrides supported for Bring-Your-Own-Key (BYOK) feature
- Prompt caching optimization for supported providers (Claude, Gemini)

#### Request Flow
1. User sends message via `components/chat-input.tsx` (supports text + file uploads)
2. Request hits `app/api/chat/route.ts` with AI SDK streaming
3. AI generates tool calls (XML) which are validated and rendered
4. `DiagramContext` manages state and syncs with draw.io embed
5. Langfuse telemetry tracks traces (optional, controlled by env vars)

### File Structure

```
app/
  api/chat/route.ts          # Main chat endpoint with AI tool definitions
  api/config/route.ts        # Runtime config endpoint (provider info)
  api/verify-access-code/    # Access code validation
  page.tsx                   # Main page with DrawIO embed + chat panels
components/
  chat-panel.tsx             # Chat UI + diagram controls
  chat-input.tsx             # Input with file upload (images/PDFs)
  history-dialog.tsx         # Version history viewer/restore
  settings-dialog.tsx        # Provider/model configuration UI
  ui/                        # shadcn/ui components (skip linting)
contexts/
  diagram-context.tsx        # Global diagram state + export logic
lib/
  ai-providers.ts            # Multi-provider model factory
  system-prompts.ts          # AI system prompts (default + extended)
  utils.ts                   # XML validation/repair utilities
  langfuse.ts                # Telemetry wrapper (optional)
  pdf-utils.ts               # PDF text/image extraction
src-tauri/                   # Desktop app (Rust + Tauri)
  src/main.rs                # Tauri entry point
  tauri.conf.json            # Desktop app configuration
```

## Important Implementation Details

### XML Generation & Validation
- AI generates draw.io XML (`<mxfile>` → `<diagram>` → `<mxGraphModel>` → `<root>`)
- Historical tool inputs are replaced with placeholders to reduce token usage (see `replaceHistoricalToolInputs`)
- `validateAndFixXml()` performs structural validation and auto-repairs common issues
- Empty diagram detection with `isMinimalDiagram()` to avoid unnecessary processing

### File Upload Handling
- Max 5 files, 2MB each (validated server + client)
- Images sent as base64 data URLs
- PDFs processed with `unpdf` to extract text and images
- File validation in `app/api/chat/route.ts` before AI processing

### Prompt Caching
- Supported providers: Claude (Anthropic/Bedrock), Gemini (Google)
- `supportsPromptCaching()` in `lib/ai-providers.ts` determines eligibility
- Extended prompts (~8000 tokens) used for models with high cache minimums
- Cache headers injected via `experimentalCacheControl` in AI SDK

### Environment Configuration
- `.env.local` for local development (copy from `env.example`)
- Required: `AI_PROVIDER`, `AI_MODEL`, provider API keys
- Optional: `ACCESS_CODE_LIST` (comma-separated passwords), `TEMPERATURE`, reasoning options
- Client overrides stored in browser localStorage (BYOK feature)

### Security Considerations
- Access code protection to prevent unauthorized usage
- File size/count validation to prevent abuse
- SSRF protection on custom base URLs (see GHSA-9qf7-mprq-9qgm)
- No sensitive data logged to Langfuse by default

## Testing & Debugging

### Running Tests
No automated test suite currently exists. Manual testing workflow:
1. Start dev server with `npm run dev`
2. Configure AI provider in `.env.local`
3. Test diagram generation with natural language prompts
4. Verify history tracking and restore functionality
5. Test file uploads (images + PDFs)

### Common Issues
- **Draw.io not loading**: Check CSP settings, ensure `embed.diagrams.net` accessible
- **XML validation errors**: Check `validateAndFixXml()` output in browser console
- **Token limit exceeded**: Use `edit_diagram` instead of `display_diagram` for small changes
- **Streaming interrupted**: Tool calls with invalid inputs are filtered in `replaceHistoricalToolInputs`

## Deployment

### Vercel (Recommended for Web)
- One-click deploy: [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FDayuanJiang%2Fnext-ai-draw-io)
- Set environment variables in Vercel dashboard (same as `.env.local`)

### Docker
```bash
docker run -d -p 3000:3000 \
  -e AI_PROVIDER=openai \
  -e AI_MODEL=gpt-4o \
  -e OPENAI_API_KEY=your_key \
  ghcr.io/dayuanjiang/next-ai-draw-io:latest
```

### Offline Deployment
If `embed.diagrams.net` is blocked, see `docs/offline-deployment.md` for self-hosted draw.io configuration.

## Model Recommendations

This task requires strong long-form text generation with strict formatting (draw.io XML). Recommended models:
- **Claude Sonnet 4.5** / **Opus 4.5** (best for cloud architecture diagrams - trained on AWS/GCP/Azure icons)
- **GPT-4o** / **o1** / **o3**
- **Gemini 2.0 Flash** / **3 Pro**
- **DeepSeek V3.2** / **R1**

Models with reasoning/thinking modes can be configured via environment variables (see `docs/ai-providers.md`).
