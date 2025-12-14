# Project Context

## Purpose
Next AI Draw.io is an AI-powered diagram creation tool that integrates Large Language Models with draw.io diagrams. Users can create, modify, and enhance diagrams through natural language commands and AI-assisted visualization. The application supports various diagram types including cloud architecture diagrams (AWS, GCP, Azure), animated connectors, and custom illustrations.

## Tech Stack
- Next.js 16.x (App Router)
- React 19.x
- TypeScript
- TailwindCSS
- Vercel AI SDK for multi-provider AI integration
- react-drawio for diagram rendering
- AWS Bedrock, OpenAI, Anthropic, Google AI, Azure OpenAI, Ollama, OpenRouter, DeepSeek, SiliconFlow providers
- Biome for linting and formatting
- Husky for git hooks

## Project Conventions

### Code Style
- TypeScript with strict typing
- Functional components with React hooks
- TailwindCSS for styling with utility-first approach
- Component composition over inheritance
- Clear separation of concerns (UI, logic, state)

### Architecture Patterns
- Next.js App Router structure
- React Context for global state management
- API routes for backend functionality
- Component-based UI architecture
- Utility-first approach with reusable helper functions

### Testing Strategy
- Unit testing for utility functions
- Component testing for UI elements
- Integration testing for API endpoints
- End-to-end testing for critical user flows

### Git Workflow
- Feature branches from main
- Pull requests with code review
- Semantic commit messages
- Squash and merge for clean history

## Domain Context
The application focuses on AI-assisted diagram creation where users interact with an AI through a chat interface to generate and modify draw.io diagrams. Diagrams are represented as XML that can be rendered in draw.io. The system supports various file inputs (PDF, text, images) and maintains diagram history.

Key concepts:
- Diagram XML representation
- AI prompt interpretation
- Cloud architecture icon sets
- Diagram versioning/history
- Multi-modal input processing (text, images, PDFs)

## Important Constraints
- XML format must be compatible with draw.io
- AI models must support long-form text generation with strict formatting
- Need to handle various cloud provider icon sets
- Security considerations for user-uploaded content
- Performance optimization for large diagrams

## External Dependencies
- draw.io/embed.diagrams.net for diagram rendering
- Various AI provider APIs (Anthropic, OpenAI, etc.)
- Cloud provider icon libraries
- PDF processing libraries (unpdf)
- XML processing libraries (@xmldom/xmldom)