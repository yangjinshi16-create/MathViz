# MathViz - Developer Guide

## 1. Project Overview

**Project**: MathViz (zju_math_helper)

**Core Function**: Transforms math/science concept names into interactive, animated HTML pages for visual learning. Uses AI/LLM providers to generate content with KaTeX math rendering.

## 2. Architecture

### Tech Stack
- **Framework**: Next.js 16.1.2 (App Router)
- **Core**: React 19.2.3, TypeScript 5.9.3
- **UI**: Radix UI, shadcn/ui, Tailwind CSS 4.2.2
- **AI Integration**: @ai-sdk/openai, @ai-sdk/anthropic, @ai-sdk/google
- **State Management**: Zustand 5.0.12
- **i18n**: i18next, react-i18next (zh-CN / en-US)

### Directory Structure
```
.
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── interactive/          # Interactive content generation
│   │   │   ├── generate/         # SSE streaming HTML generation
│   │   │   ├── validate/         # HTML quality validation
│   │   │   └── post-process/     # KaTeX injection & post-processing
│   │   ├── server-providers/     # Server provider configuration
│   │   └── verify-model/         # Model connectivity verification
│   ├── interactive-agent/        # Main interactive page
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Root (redirects to /interactive-agent)
├── components/                   # React components
│   ├── settings/                 # Settings panel (providers, general)
│   └── ui/                       # Base UI components (shadcn/ui)
├── lib/
│   ├── ai/                       # AI provider registry
│   ├── interactive/              # Core generation logic
│   │   ├── service.ts            # Main generation service (DI pattern)
│   │   ├── llm.ts                # LLM call abstraction
│   │   ├── prompt-builder.ts     # Prompt construction
│   │   ├── prompt-templates.ts   # Prompt templates
│   │   ├── html-extractor.ts     # HTML extraction from LLM output
│   │   ├── quality-guard.ts      # Quality validation & repair
│   │   └── post-processor.ts     # Post-processing pipeline
│   ├── server/                   # Server-side utilities
│   ├── store/                    # Zustand state management
│   ├── i18n/                     # Internationalization
│   ├── logger.ts                 # Logging utility
│   └── utils/                    # General utilities
├── tests/                        # Unit tests (Vitest)
└── public/                       # Static assets (logos, favicon)
```

## 3. Build & Test Commands

```bash
# Install dependencies
pnpm install

# Development server (http://localhost:3000)
pnpm dev

# Production build
pnpm build
pnpm start

# Lint
pnpm lint

# Unit tests
pnpm test
```

## 4. API Reference

### POST /api/interactive/generate
Generates an interactive animated HTML page. Uses SSE streaming.

**Request Body**:
```json
{
  "conceptName": "Simple Harmonic Motion",
  "model": {
    "providerId": "openai",
    "model": "gpt-4o",
    "apiKey": "sk-xxx",
    "baseUrl": "https://api.openai.com/v1",
    "requiresApiKey": true
  },
  "subject": "Physics",
  "conceptOverview": "Brief overview",
  "designIdea": "Design description",
  "keyPoints": ["Point 1", "Point 2"],
  "language": "en"
}
```

### POST /api/interactive/validate
Validates HTML content quality.

### POST /api/interactive/post-process
Post-processes HTML (KaTeX injection, LaTeX delimiter fixes).

### GET /api/server-providers
Returns server-configured providers.

### POST /api/verify-model
Verifies model configuration is valid.

## 5. Quality Strategy

1. **Scientific Modeling**: AI models concepts as scientific visualizations
2. **HTML Generation**: Generates interactive animated HTML
3. **Quality Guard**: Validates generated content
4. **Repair Loop**: Auto-repairs on validation failure (one attempt)
5. **Post-Processing**: Injects KaTeX rendering and fixes LaTeX delimiters

## 6. Routes

- `/` — Root (auto-redirects to /interactive-agent)
- `/interactive-agent` — Main interactive agent page

## 7. Environment Variables

Create `.env.local` (optional — UI configuration is also supported):

```env
# AI providers (optional, configure via UI)
OPENAI_API_KEY=your-api-key
ANTHROPIC_API_KEY=your-api-key
GOOGLE_GENERATIVE_API_KEY=your-api-key

# Server defaults
OPENAI_MODELS=gpt-4o,gpt-4o-mini
DEFAULT_MODEL=openai:gpt-4o
```

## 8. FAQ

### How to switch AI providers?
Select a provider in the UI settings (OpenAI / Anthropic / Google / DeepSeek / Custom) and enter the API key and base URL.

### How to export generated HTML?
After generation, click the "Download HTML" button in the preview panel.

### How does LaTeX rendering work?
KaTeX is automatically injected during post-processing. No manual configuration needed.
