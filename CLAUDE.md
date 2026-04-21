# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MathViz (`zju-math-helper`) — AI-powered interactive math/science visualization generator. Given a concept name (e.g. "Fourier Transform"), it uses LLMs to produce self-contained HTML pages with animations, KaTeX math rendering, and parameter controls.

## Commands

```bash
pnpm dev          # Dev server (Turbopack, http://localhost:3000)
pnpm build        # Production build (standalone output via build.sh)
pnpm start        # Run production build
pnpm lint         # ESLint
pnpm test         # Vitest (single run)
```

Package manager: **pnpm** (required). Node.js 18+.

## Architecture

### Core Generation Pipeline (`lib/interactive/`)

The heart of the app is a multi-stage pipeline orchestrated by `service.ts`:

1. **Scientific Modeling** — LLM produces structured JSON (`core_formulas`, `mechanism`, `constraints`, `forbidden_errors`) as guardrails
2. **HTML Generation** — LLM generates a full self-contained HTML page, constrained by the scientific model
3. **HTML Extraction** — Robust parser handles markdown code blocks, truncation, edge cases
4. **Quality Validation** — Checks structure, blocks `eval()`/`new Function()`, enforces allowed external scripts (Tailwind CDN, KaTeX CDN only)
5. **Auto-Repair** — One retry on validation failure, sending errors back to LLM
6. **Post-Processing** — LaTeX delimiter conversion (`$...$` → `\(...\)`) and KaTeX CSS/JS injection

`service.ts` uses **dependency injection** via `InteractiveAgentDependencies` — the core logic is fully testable without real LLM calls (see `tests/interactive-service.test.ts`).

### Two LLM Abstraction Layers

- **`lib/interactive/llm.ts`** — Raw `openai` Node SDK, used by the generation pipeline. Streaming internally, 5-min timeout. Resolves provider API keys from env vars (`{PROVIDER}_API_KEY`, `{PROVIDER}_BASE_URL`).
- **`lib/ai/providers.ts`** — Vercel AI SDK (`@ai-sdk/*`), used for model verification. Factory pattern via `getModel()`. Supports 11 built-in providers + custom providers.

These are **separate systems** — don't mix them up when editing.

### API Routes (`app/api/interactive/`)

- `POST /api/interactive/generate` — SSE streaming endpoint. Events: `heartbeat` (15s), `start`, `progress`, `result`, `error`. `maxDuration = 300s`.
- `POST /api/interactive/validate` — Standalone validation
- `POST /api/interactive/post-process` — Standalone post-processing

### State Management (`lib/store/settings.ts`)

Zustand with `persist` middleware → localStorage (`settings-storage`). Handles migration (v0→v1→v2), auto-merging built-in providers on rehydration, server provider fetching.

### Provider System (`lib/ai/providers.ts`)

- **Native SDK types**: OpenAI, Anthropic, Google
- **OpenAI-compatible**: DeepSeek, Qwen, Kimi, GLM, SiliconFlow, Doubao, Grok
- **Anthropic-compatible**: MiniMax
- **Custom**: `custom-*` prefix, added via UI

Each model defines `thinking` capabilities (toggleable, budget-adjustable).

### i18n

i18next with `zh-CN` and `en-US`. Translation files in `lib/i18n/locales/`. Hook: `useI18n()` from `lib/hooks/use-i18n.tsx`.

## Key Patterns

- **Concept category inference** in `service.ts` classifies input into physics/math/chemistry/cs/data/general via regex, then applies category-specific prompt strategies
- **SSRF protection** (`lib/server/ssrf-guard.ts`) blocks private IPs and localhost in production base URLs
- **HTML sandboxing** — generated content renders in an iframe with restricted `sandbox` attributes
- **Server config** via `.env.local` — provider keys and default model can be set server-side, merged with client-side settings on mount via `ServerProvidersInit`
