import { NextRequest, NextResponse } from 'next/server';
import {
  buildPrompt,
  callLlmWithModelConfig,
  generateInteractivePage,
  InteractiveAgentError,
  parseJsonResponse,
  postProcessInteractiveHtml,
  type GenerateInteractivePageInput,
  type ModelConfig,
} from '../../../../lib/interactive';

type GenerateBody = GenerateInteractivePageInput & { model?: ModelConfig };

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateBody;
    if (!body.conceptName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'MISSING_REQUIRED_FIELD', details: 'conceptName is required' },
        { status: 400 },
      );
    }
    const headerModel = req.headers.get('x-model') || '';
    const [headerProviderId, headerModelId] = headerModel.includes(':')
      ? headerModel.split(':')
      : ['', ''];
    const model = body.model || {
      providerId: (headerProviderId || 'openai') as ModelConfig['providerId'],
      model: headerModelId || headerModel || '',
      apiKey: req.headers.get('x-api-key') || '',
      baseUrl: req.headers.get('x-base-url') || '',
      requiresApiKey: (req.headers.get('x-requires-api-key') || 'false') === 'true',
    };
    if (!model) {
      return NextResponse.json(
        { success: false, error: 'MODEL_CONFIG_INVALID', details: 'model config is required' },
        { status: 400 },
      );
    }

    const result = await generateInteractivePage(
      {
        title: body.title,
        conceptName: body.conceptName.trim(),
        conceptOverview: body.conceptOverview,
        designIdea: body.designIdea,
        subject: body.subject,
        keyPoints: body.keyPoints,
        language: body.language,
      },
      {
        aiCall: (systemPrompt, userPrompt) => callLlmWithModelConfig(model, systemPrompt, userPrompt),
        buildPrompt,
        parseJsonResponse,
        postProcessHtml: postProcessInteractiveHtml,
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        html: result.html,
        scientificModel: result.scientificModel,
        warnings: result.warnings,
        diagnostics: result.diagnostics,
      },
    });
  } catch (error) {
    if (error instanceof InteractiveAgentError) {
      return NextResponse.json(
        {
          success: false,
          error: error.code,
          details: error.details?.join('; ') || error.message,
        },
        { status: error.code === 'MISSING_REQUIRED_FIELD' || error.code === 'MODEL_CONFIG_INVALID' ? 400 : 422 },
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
