import OpenAI from 'openai';
import type { ModelConfig } from './types';
import { InteractiveAgentError } from './types';

// Default timeout for API requests (in milliseconds)
const DEFAULT_TIMEOUT = 300000; // 5 minutes

function resolveEnvKey(providerId?: string): string {
  const pid = (providerId || '').toLowerCase();
  if (!pid) return 'OPENAI';
  if (pid.startsWith('custom-')) return 'OPENAI';
  switch (pid) {
    case 'openai':
      return 'OPENAI';
    case 'anthropic':
      return 'ANTHROPIC';
    case 'google':
      return 'GOOGLE';
    case 'deepseek':
      return 'DEEPSEEK';
    case 'qwen':
      return 'QWEN';
    case 'kimi':
      return 'KIMI';
    case 'minimax':
      return 'MINIMAX';
    case 'glm':
      return 'GLM';
    case 'siliconflow':
      return 'SILICONFLOW';
    case 'doubao':
      return 'DOUBAO';
    case 'grok':
      return 'GROK';
    case 'openrouter':
      return 'OPENROUTER';
    default:
      return pid.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  }
}

/**
 * Parse error from OpenAI SDK error response
 */
function parseApiError(error: unknown): string {
  // Handle OpenAI SDK's error structure
  const errObj = error as Record<string, unknown>;
  const errorMessage = errObj.message as string | undefined;
  const errorCode = errObj.code as string | undefined;
  const errorType = errObj.type as string | undefined;
  const errorStatus = errObj.status as number | undefined;

  // Check for common patterns
  if (errorMessage) {
    // Handle authentication errors
    if (
      errorStatus === 401 ||
      errorCode?.includes('invalid_request') ||
      errorCode === 'invalid_api_key' ||
      errorType?.includes('authentication') ||
      errorMessage.toLowerCase().includes('auth') ||
      errorMessage.toLowerCase().includes('invalid api key')
    ) {
      return `Authentication failed: ${errorMessage}`;
    }

    // Handle permission/forbidden errors
    if (errorStatus === 403 || errorType?.includes('forbidden')) {
      return `Access forbidden: Check API key permissions`;
    }

    // Handle not found errors
    if (errorStatus === 404 || errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('model not found')) {
      return `Model not found: ${errorMessage}`;
    }

    // Handle rate limit errors
    if (errorStatus === 429 || errorCode?.includes('rate_limit') || errorMessage.toLowerCase().includes('rate limit')) {
      return `Rate limit exceeded: Please try again later`;
    }

    // Handle connection errors
    if (
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('fetch failed') ||
      errorMessage.includes('network error')
    ) {
      return `Connection failed: Cannot reach API server. Check network and Base URL. Original: ${errorMessage}`;
    }

    // Handle server errors
    if (errorStatus && errorStatus >= 500) {
      return `API server error (${errorStatus}): ${errorMessage}`;
    }

    // Return original message for other cases
    return errorMessage;
  }

  // Fallback for unknown error format
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function callLlmWithModelConfig(
  config: ModelConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  if (!config.model?.trim()) {
    throw new InteractiveAgentError('MODEL_CONFIG_INVALID', 'Model is required.');
  }

  const envKey = resolveEnvKey(config.providerId);
  const envApiKey = process.env[`${envKey}_API_KEY`] || process.env.OPENAI_API_KEY;
  const apiKey = config.apiKey?.trim() || envApiKey || '';
  const envBaseUrl = process.env[`${envKey}_BASE_URL`] || process.env.OPENAI_BASE_URL;
  const baseURL = config.baseUrl?.trim() || envBaseUrl || undefined;

  if (config.requiresApiKey && !apiKey) {
    throw new InteractiveAgentError(
      'MODEL_CONFIG_INVALID',
      `API key required for provider: ${config.providerId || 'unknown'}. Please configure your API key in settings.`,
    );
  }

  console.log('[callLlm] Calling model:', {
    providerId: config.providerId,
    model: config.model,
    hasApiKey: !!apiKey,
    baseURL: baseURL || '(default)',
  });

  const client = new OpenAI({
    apiKey: apiKey || 'no-key-required',
    baseURL,
    timeout: DEFAULT_TIMEOUT,
  });

  try {
    // Use streaming to keep the connection alive and avoid gateway timeouts
    const stream = await client.chat.completions.create({
      model: config.model.trim(),
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
    });

    // Collect the full response from the stream
    let fullContent = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
      }
    }

    if (!fullContent) {
      throw new InteractiveAgentError('MODEL_CONFIG_INVALID', 'Empty LLM response.');
    }
    return fullContent;
  } catch (error) {
    const parsedError = parseApiError(error);
    console.error('[callLlm] Error:', parsedError);
    throw new InteractiveAgentError('MODEL_CONFIG_INVALID', parsedError);
  }
}
