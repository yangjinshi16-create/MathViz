import { NextRequest } from 'next/server';
import { parseModelString } from '@/lib/ai/providers';
import { resolveModel, resolveModelFromHeaders } from '@/lib/server/resolve-model';
import {
  buildPrompt,
  callLlmWithModelConfig,
  generateInteractivePage,
  InteractiveAgentError,
  parseJsonResponse,
  postProcessInteractiveHtml,
  type GenerateInteractivePageInput,
  type ModelConfig,
} from '@/lib/interactive';

export const maxDuration = 300;

type GenerateBody = GenerateInteractivePageInput & { model?: ModelConfig };

/**
 * SSE helper: create a ReadableStream that sends SSE events
 */
function createSSEStream(onMessage: (send: (event: string, data: unknown) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(msg));
        } catch {
          // Controller might be closed
        }
      };

      // Send an initial heartbeat to establish the connection
      send('heartbeat', { ts: Date.now() });

      try {
        await onMessage(send);
      } catch (error) {
        if (!closed) {
          send('error', {
            error: error instanceof InteractiveAgentError ? error.code : 'INTERNAL_ERROR',
            details: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        if (!closed) {
          closed = true;
          try { controller.close(); } catch { /* already closed */ }
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return stream;
}

export async function POST(req: NextRequest) {
  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'INVALID_BODY', details: 'Failed to parse request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Debug logging for all providers
  console.log('[Generate API] Request model config:', {
    providerId: body.model?.providerId,
    model: body.model?.model,
    hasApiKey: !!body.model?.apiKey,
    apiKeyLength: body.model?.apiKey?.length || 0,
    baseUrl: body.model?.baseUrl,
    requiresApiKey: body.model?.requiresApiKey,
  });

  if (!body.conceptName?.trim()) {
    return new Response(JSON.stringify({ success: false, error: 'MISSING_REQUIRED_FIELD', details: 'conceptName is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const explicitModelString = body.model?.model
    ? `${body.model.providerId}:${body.model.model}`
    : undefined;
  const resolved = explicitModelString
    ? resolveModel({
        modelString: explicitModelString,
        apiKey: body.model?.apiKey || '',
        baseUrl: body.model?.baseUrl || undefined,
        requiresApiKey: body.model?.requiresApiKey,
        providerType: req.headers.get('x-provider-type') || undefined,
      })
    : resolveModelFromHeaders(req);

  const { providerId, modelId } = parseModelString(resolved.modelString);
  const model: ModelConfig = {
    providerId,
    model: modelId,
    apiKey: resolved.apiKey,
    baseUrl: resolved.baseUrl || '',
    requiresApiKey:
      body.model?.requiresApiKey ??
      (req.headers.get('x-requires-api-key') || 'false') === 'true',
  };

  console.log('[Generate API] Resolved model:', {
    providerId,
    modelId,
    hasApiKey: !!model.apiKey,
    apiKeyLength: model.apiKey?.length || 0,
    baseUrl: model.baseUrl,
  });

  // Create SSE streaming response
  const stream = createSSEStream(async (send) => {
    send('start', { conceptName: body.conceptName, model: modelId, providerId });

    // Heartbeat: keep the connection alive every 15 seconds
    const heartbeatInterval = setInterval(() => {
      send('heartbeat', { ts: Date.now() });
    }, 15000);

    try {
      const result = await generateInteractivePage(
        {
          title: body.title,
          conceptName: body.conceptName!.trim(),
          conceptOverview: body.conceptOverview,
          designIdea: body.designIdea,
          subject: body.subject,
          keyPoints: body.keyPoints,
          language: body.language,
        },
        {
          aiCall: (systemPrompt, userPrompt) => {
            send('progress', { stage: 'calling_llm', message: '正在调用 AI 模型...' });
            return callLlmWithModelConfig(model, systemPrompt, userPrompt);
          },
          buildPrompt: (type, params) => {
            const stageMap: Record<string, string> = {
              'interactive-scientific-model': '正在构建科学可视化模型...',
              'interactive-html': '正在设计交互式动画...',
              'interactive-html-repair': '正在自动修复...',
            };
            send('progress', { stage: type, message: stageMap[type] || '处理中...' });
            return buildPrompt(type, params);
          },
          parseJsonResponse,
          postProcessHtml: (html) => {
            send('progress', { stage: 'post_processing', message: '正在后处理 HTML...' });
            return postProcessInteractiveHtml(html);
          },
        },
      );

      clearInterval(heartbeatInterval);
      send('result', {
        success: true,
        data: {
          html: result.html,
          scientificModel: result.scientificModel,
          warnings: result.warnings,
          diagnostics: result.diagnostics,
        },
      });
    } catch (error) {
      clearInterval(heartbeatInterval);
      if (error instanceof InteractiveAgentError) {
        send('error', {
          error: error.code,
          details: error.details?.join('; ') || error.message,
        });
      } else {
        send('error', {
          error: 'INTERNAL_ERROR',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
