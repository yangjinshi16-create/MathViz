import OpenAI from 'openai';
import type { ModelConfig } from './types';
import { InteractiveAgentError } from './types';

export async function callLlmWithModelConfig(
  config: ModelConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  if (!config.model?.trim()) {
    throw new InteractiveAgentError('MODEL_CONFIG_INVALID', 'Model is required.');
  }
  if (config.requiresApiKey && !config.apiKey?.trim()) {
    throw new InteractiveAgentError(
      'MODEL_CONFIG_INVALID',
      `API key required for provider: ${config.providerId || 'unknown'}`,
    );
  }

  const apiKey = config.apiKey?.trim() || process.env.OPENAI_API_KEY || 'no-key-required';
  const client = new OpenAI({
    apiKey,
    baseURL: config.baseUrl?.trim() || process.env.OPENAI_BASE_URL || undefined,
  });

  const result = await client.chat.completions.create({
    model: config.model.trim(),
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = result.choices?.[0]?.message?.content;
  if (!text) {
    throw new InteractiveAgentError('MODEL_CONFIG_INVALID', 'Empty LLM response.');
  }
  return text;
}
