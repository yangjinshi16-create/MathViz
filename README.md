# zju_math_helper（独立项目）

这是一个已经从主仓库解耦出的独立项目，只保留“输入概念 -> 生成交互式动画 HTML”的能力。

## 1. 安装与启动

```powershell
cd zju_math_helper
pnpm install
pnpm dev
```

打开：

- `http://localhost:3000`

## 2. 使用方式

1. 在页面输入 `Concept Name`（必填）
2. 选择服务商与模型（OpenAI / OpenRouter / SiliconFlow / Custom）
3. 填写 API Key（如果该服务商要求）
4. 点击“生成网页”
5. 右侧预览，点击“下载 HTML”导出

其余参数全部可选：

- Subject
- Concept Overview
- Design Idea
- Key Points
- Language

## 3. API

### `POST /api/interactive/generate`

最小请求体：

```json
{
  "conceptName": "Simple Harmonic Motion",
  "model": {
    "providerId": "openai",
    "model": "gpt-4.1",
    "apiKey": "sk-xxx",
    "baseUrl": "https://api.openai.com/v1",
    "requiresApiKey": true
  }
}
```

### `POST /api/interactive/validate`

```json
{
  "html": "<!DOCTYPE html><html>...</html>"
}
```

### `POST /api/interactive/post-process`

```json
{
  "html": "<!DOCTYPE html><html>...</html>"
}
```

## 4. 质量策略

- 科学建模 -> HTML 生成 -> 质量守卫
- 若质量守卫失败，自动触发一次修复重写（repair loop）
- 自动注入 KaTeX 渲染与 LaTeX 分隔符修正

## 5. 验证命令

```powershell
pnpm lint
pnpm test
pnpm build
```
