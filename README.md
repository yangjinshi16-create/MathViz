# MathViz

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)

**将抽象的数学与科学概念，变为可交互的动画可视化。**

输入一个概念名称（如 "Fourier Transform"），AI 自动生成带动画、参数控制和 KaTeX 公式渲染的独立 HTML 页面。

> Language / 语言: **[中文](#-快速开始)** | **[English](#-quick-start)**

![MathViz Cover](./assets/封面.png)

---

## ✨ 功能亮点

- **一句话生成** — 输入概念名称，AI 自动完成建模、编码、质量校验全流程
- **交互式动画** — 支持参数调节、播放控制、实时响应的动态可视化
- **多 AI 服务商** — 支持 OpenAI / Anthropic / Google / DeepSeek / Qwen 等 11+ 服务商
- **即开即用** — 生成结果为独立 HTML 文件，无需任何依赖即可分享与使用
- **中英双语** — 完整的中英文界面支持

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm（推荐）或 npm / yarn

### 安装与运行

```bash
git clone https://github.com/yangjinshi16-create/MathViz.git
cd MathViz
pnpm install
pnpm dev
```

打开 http://localhost:3000 即可使用。

### 部署地址

**https://futtcm0cbr4u.meoo.zone/**

## 📖 使用方式

### 1. 配置 AI 服务商

在设置面板中填入 API Key 和 Base URL，点击验证即可使用。

![使用界面 - API 配置](./assets/使用界面.png)

### 2. 输入概念，生成可视化

选择服务商与模型，输入概念名称（必填），可选填写学科、概述、设计想法和关键知识点。

![使用案例 - 输入与生成](./assets/案例.png)

### 3. 预览与导出

生成完成后在右侧预览交互式动画，点击"Download HTML"导出为独立 HTML 文件。

![使用案例 - 渲染预览](./assets/案例2.png)

## 🏗️ 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router, Turbopack) |
| 前端 | React 19, TypeScript 5 |
| UI | Radix UI, shadcn/ui, Tailwind CSS 4 |
| AI | Vercel AI SDK, OpenAI SDK |
| 状态管理 | Zustand (localStorage 持久化) |
| 国际化 | i18next (中文 / English) |
| 数学渲染 | KaTeX |
| 测试 | Vitest |

## 🔧 质量保障

1. **科学建模** — AI 先将概念建模为结构化 JSON（公式、机理、约束），作为生成的科学护栏
2. **HTML 生成** — 基于科学模型约束生成完整自包含 HTML 页面
3. **质量验证** — 检查页面结构、禁止危险函数（`eval` / `new Function`）、限制外部脚本
4. **自动修复** — 验证失败时自动触发一次修复重写
5. **后处理** — 注入 KaTeX 渲染引擎，修正 LaTeX 分隔符语法

## 📁 项目结构

```
.
├── app/
│   ├── api/
│   │   ├── interactive/        # 核心生成 API (generate / validate / post-process)
│   │   ├── server-providers/   # 服务端 Provider 配置
│   │   └── verify-model/       # 模型连接验证
│   └── interactive-agent/      # 主交互页面
├── components/
│   ├── settings/               # 设置面板 (Provider 管理、模型配置)
│   └── ui/                     # 基础 UI 组件 (shadcn/ui)
├── lib/
│   ├── ai/                     # AI Provider 注册表 (11+ 服务商)
│   ├── interactive/            # 核心生成管线 (service / llm / prompt / quality)
│   ├── server/                 # 服务端工具 (SSRF 防护、模型解析)
│   ├── store/                  # Zustand 状态管理
│   └── i18n/                   # 国际化 (中/英)
└── tests/                      # 单元测试 (Vitest)
```

## 🛠️ 开发命令

```bash
pnpm dev      # 开发服务器 (http://localhost:3000)
pnpm build    # 生产构建 (standalone 输出)
pnpm start    # 启动生产服务
pnpm lint     # ESLint 代码检查
pnpm test     # 运行单元测试
```

## 许可证

[MIT](./LICENSE)

---

# MathViz

**Turn abstract math and science concepts into interactive animated visualizations.**

Enter a concept name (e.g. "Fourier Transform"), and AI automatically generates a self-contained HTML page with animations, parameter controls, and KaTeX formula rendering.

![MathViz Cover](./assets/封面.png)

## Quick Start

### Requirements

- Node.js 18+
- pnpm (recommended) or npm / yarn

### Installation

```bash
git clone https://github.com/yangjinshi16-create/MathViz.git
cd MathViz
pnpm install
pnpm dev
```

Open http://localhost:3000 to get started.

**Live demo: https://futtcm0cbr4u.meoo.zone/**

### Environment Variables (Optional)

Create `.env.local` to configure server-side API keys (or configure directly in the UI):

```env
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODELS=gpt-4o,gpt-4o-mini
DEFAULT_MODEL=openai:gpt-4o
```

## Usage

1. Enter a **Concept Name** (required) — e.g. "Fourier Transform"
2. Select an AI provider and model
3. Enter your API Key
4. Click "Generate"
5. Preview and download the generated HTML

Optional parameters: Subject, Concept Overview, Design Idea, Key Points, Language.

## Quality Pipeline

1. **Scientific Modeling** — AI structures concepts as scientific visualizations with constraints
2. **HTML Generation** — Generates interactive animated HTML guided by the scientific model
3. **Quality Validation** — Structural integrity and security checks
4. **Auto-Repair** — One-shot repair loop on validation failure
5. **Post-Processing** — KaTeX injection and LaTeX syntax correction

## License

[MIT](./LICENSE)
