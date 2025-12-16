# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Project Overview

Next AI Draw.io is an AI-powered diagram creation tool built with Next.js and Tauri. It integrates LLMs with draw.io to generate and modify diagrams through natural language, supporting multiple AI providers (Bedrock, OpenAI, Anthropic, Google, Azure, Ollama, OpenRouter, DeepSeek, SiliconFlow).

## Common Commands

### Development
```bash
npm run dev              # Start Next.js dev server on port 6002
npm run build            # Build Next.js production bundle
npm run start            # Start Next.js production server on port 6001
```

### Code Quality
```bash
npm run lint             # Lint code with Biome
npm run format           # Format code with Biome (auto-fix)
npm run check            # Run Biome CI checks (no auto-fix)
```

### Tauri Desktop App
```bash
npm run tauri:dev        # Run desktop app in dev mode (requires Rust)
npm run tauri:build      # Build desktop app for production
npm run build:desktop    # Full build: Next.js → Tauri (runs scripts/build-desktop.js)
```

**Note**: Desktop builds require Rust installed: https://www.rust-lang.org/tools/install

### Testing
This project does not have a test suite configured. Testing is manual.

## Code Architecture

### High-Level Structure

**Next.js App Router Architecture:**
- `app/page.tsx` - Main page with DrawIO embed and resizable panels
- `app/api/chat/route.ts` - Streaming chat API endpoint with AI tools
- `contexts/diagram-context.tsx` - Global state for diagram XML, history, export
- `components/chat-panel.tsx` - Chat UI with message streaming and file upload
- `lib/ai-providers.ts` - Multi-provider AI configuration with reasoning support

**Tauri Desktop Integration:**
- `src-tauri/` - Rust backend for desktop app
- `src-tauri/tauri.conf.json` - Desktop app configuration
- `hooks/useEnvironment.ts`, `hooks/useFileSystem.ts` - Desktop feature detection

### Key Architectural Patterns

**1. AI Tool Execution Flow**

The app uses Vercel AI SDK's streaming tools:
- **display_diagram**: Generates new diagram from mxCell XML fragments
- **edit_diagram**: Makes targeted edits with search/replace on exact XML matches
- **append_diagram**: Continues truncated XML generation

Tools execute **client-side** via `convertToUIMessageStream()`, not server-side. The server streams tool calls, and the client executes them to update the diagram.

**2. XML Processing & Validation**

Draw.io diagrams are XML-based. The app:
- **Strips wrapper tags**: AI generates only `<mxCell>` elements (no `<mxfile>`, `<mxGraphModel>`, `<root>`)
- **Validates XML**: `lib/utils.ts` contains extensive XML validation/fixing logic
- **Caches prompts**: Bedrock/Claude models use prompt caching for system messages and conversation history (see `app/api/chat/route.ts:277-318`)

**3. State Management**

- **DiagramContext** (`contexts/diagram-context.tsx`): Manages diagram XML, SVG, history, exports
- **localStorage**: Persists messages, XML snapshots, session IDs, settings
- **DrawIO iframe**: Communicates via `react-drawio` library

**4. Multi-Provider AI Support**

`lib/ai-providers.ts` handles:
- Auto-detection of provider from env vars
- Client-side API key overrides (users can bring their own keys)
- Provider-specific reasoning configs (OpenAI o1/o3, Anthropic thinking, Gemini 2.5/3, Bedrock Claude/Nova)

**5. Desktop App (Tauri v2)**

- Uses Tauri v2 API (`@tauri-apps/api` v2.9.1)
- Builds with `output: "standalone"` mode in Next.js
- Build process: `scripts/build-desktop.js` handles Next.js → Tauri pipeline
- Icons in `icons_new/` (fixed dimensions for Tauri requirements)

## Important Implementation Details

### XML Generation Requirements

When working on diagram generation:
- AI must generate **only** `<mxCell>` elements (no wrapper tags)
- Root cells (id="0", id="1") are auto-added by the client
- All cells need unique IDs (start from "2")
- Special chars must be escaped: `&lt;` `&gt;` `&amp;` `&quot;`

See system prompts in `lib/system-prompts.ts` for full AI instructions.

### Prompt Caching Strategy

The chat API uses multi-level caching (Bedrock/Claude only):
1. **Cache point 1**: System instructions (~1500 tokens)
2. **Cache point 2**: Current diagram XML (changes per turn)
3. **Cache point 3**: Last assistant message in history

See `app/api/chat/route.ts:277-318` for implementation.

### File Upload Handling

- **Images**: Base64 data URLs, max 2MB per file, max 5 files
- **PDFs**: Extracted via `lib/pdf-utils.ts` (unpdf library)
- **Text files**: Direct text extraction
- Validation in `app/api/chat/route.ts:30-63`

### Environment Variables

Key vars (see `env.example` for full list):
- `AI_PROVIDER`, `AI_MODEL` - AI configuration
- `ACCESS_CODE_LIST` - Optional password protection
- `TEMPERATURE` - Model temperature (optional)
- `LANGFUSE_*` - Optional LLM observability
- `ENABLE_PDF_INPUT` - Toggle PDF upload feature
- Provider-specific reasoning configs (see env.example)

### Code Style

- **Formatter**: Biome (4 spaces, double quotes, semicolons as needed)
- **Linter**: Biome with recommended rules (some a11y/complexity rules disabled)
- **Imports**: No Node.js import protocol (`node:`)
- **UI components**: `components/ui/**` excluded from linting/formatting

### Desktop-Specific Features

- File system access via Tauri dialog plugin
- Auto-updates via Tauri updater plugin (configured in `tauri.conf.json`)
- Environment detection via `lib/desktop-environment.ts`
- Tray icon support (feature flag in `Cargo.toml`)

## Key Files to Know

- `app/api/chat/route.ts` - Core AI streaming logic, tool definitions, caching
- `lib/ai-providers.ts` - AI provider setup, reasoning configs
- `lib/utils.ts` - XML validation/fixing, compression helpers
- `lib/system-prompts.ts` - AI prompts for diagram generation
- `contexts/diagram-context.tsx` - Diagram state management
- `components/chat-panel.tsx` - Chat UI, auto-retry logic, file processing
- `scripts/build-desktop.js` - Desktop build pipeline
- `src-tauri/tauri.conf.json` - Tauri configuration

## Development Notes

- **Port 6002**: Dev server (avoid conflicts with other Next.js apps)
- **No ESLint**: Uses Biome instead
- **No test suite**: Manual testing only
- **Standalone output**: Required for Tauri desktop builds
- **OpenSpec integration**: See `openspec/AGENTS.md` for change proposal workflow
