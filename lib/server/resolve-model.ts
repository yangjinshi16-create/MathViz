import type { NextRequest } from 'next/server';
import { getModel, parseModelString, type ModelWithInfo } from '@/lib/ai/providers';
import { resolveApiKey, resolveBaseUrl } from '@/lib/server/provider-config';
import { validateUrlForSSRF } from '@/lib/server/ssrf-guard';

export interface ResolvedModel extends ModelWithInfo {
  modelString: string;
  apiKey: string;
  baseUrl?: string;
}

export function resolveModel(params: {
  modelString?: string;
  apiKey?: string;
  baseUrl?: string;
  providerType?: string;
  requiresApiKey?: boolean;
}): ResolvedModel {
  const modelString = params.modelString || process.env.DEFAULT_MODEL || 'openai:gpt-4o-mini';
  const { providerId, modelId } = parseModelString(modelString);

  // Resolve base URL: explicit > provider default
  const explicitBaseUrl = params.baseUrl?.trim() || undefined;
  const defaultBaseUrl = resolveBaseUrl(providerId, params.baseUrl);
  const effectiveBaseUrl = explicitBaseUrl || defaultBaseUrl;

  // SSRF protection: check ALL base URLs in production (not just client-provided ones)
  if (effectiveBaseUrl && process.env.NODE_ENV === 'production') {
    const ssrfError = validateUrlForSSRF(effectiveBaseUrl);
    if (ssrfError) throw new Error(ssrfError);
  }

  // Use client API key if provided, otherwise try server-side env
  const clientApiKey = params.apiKey?.trim() || '';
  const apiKey = explicitBaseUrl
    ? clientApiKey || ''
    : resolveApiKey(providerId, clientApiKey);

  const baseUrl = effectiveBaseUrl;

  const { model, modelInfo } = getModel({
    providerId,
    modelId,
    apiKey,
    baseUrl,
    providerType: params.providerType as 'openai' | 'anthropic' | 'google' | undefined,
    requiresApiKey: params.requiresApiKey,
  });

  return { model, modelInfo, modelString, apiKey, baseUrl };
}

export function resolveModelFromHeaders(req: NextRequest): ResolvedModel {
  return resolveModel({
    modelString: req.headers.get('x-model') || undefined,
    apiKey: req.headers.get('x-api-key') || undefined,
    baseUrl: req.headers.get('x-base-url') || undefined,
    providerType: req.headers.get('x-provider-type') || undefined,
    requiresApiKey: req.headers.get('x-requires-api-key') === 'true' ? true : undefined,
  });
}
