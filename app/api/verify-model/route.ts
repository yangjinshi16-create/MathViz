import { NextRequest, NextResponse } from 'next/server';
import { callLlmWithModelConfig } from '@/lib/interactive';

type VerifyBody = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  providerType?: string;
  requiresApiKey?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VerifyBody;
    const model = body.model || '';
    const [providerId, modelId] = model.includes(':') ? model.split(':') : ['openai', model];
    if (!modelId) {
      return NextResponse.json({ success: false, error: 'model is required' }, { status: 400 });
    }

    await callLlmWithModelConfig(
      {
        providerId,
        model: modelId,
        apiKey: body.apiKey,
        baseUrl: body.baseUrl,
        requiresApiKey: body.requiresApiKey,
      },
      'You are a connectivity check assistant.',
      'Return exactly: OK',
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
