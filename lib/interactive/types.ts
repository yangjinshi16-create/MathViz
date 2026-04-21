export type InteractiveLanguage = 'zh-CN' | 'en-US';

export interface ScientificModel {
  core_formulas: string[];
  mechanism: string[];
  constraints: string[];
  forbidden_errors: string[];
}

export interface GenerateInteractivePageInput {
  title?: string;
  conceptName: string;
  conceptOverview?: string;
  designIdea?: string;
  subject?: string;
  keyPoints?: string[];
  language?: InteractiveLanguage;
}

export interface InteractiveValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GenerateInteractivePageResult {
  html: string;
  scientificModel?: ScientificModel;
  warnings: string[];
  diagnostics: InteractiveValidationResult;
}

export interface BuildPromptResult {
  system: string;
  user: string;
}

export interface InteractiveAgentDependencies {
  aiCall: (systemPrompt: string, userPrompt: string) => Promise<string>;
  buildPrompt: (
    promptId: 'interactive-scientific-model' | 'interactive-html' | 'interactive-html-repair',
    variables: Record<string, unknown>,
  ) => BuildPromptResult | null | undefined;
  parseJsonResponse: <T>(response: string) => T | null;
  postProcessHtml: (html: string) => string;
  logger?: {
    info?: (...args: unknown[]) => void;
    warn?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
  };
}

export class InteractiveAgentError extends Error {
  constructor(
    readonly code:
      | 'MISSING_REQUIRED_FIELD'
      | 'PROMPT_BUILD_FAILED'
      | 'HTML_EXTRACTION_FAILED'
      | 'QUALITY_GUARD_FAILED'
      | 'MODEL_CONFIG_INVALID',
    message: string,
    readonly details?: string[],
  ) {
    super(message);
    this.name = 'InteractiveAgentError';
  }
}

export interface ModelConfig {
  providerId: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
  requiresApiKey?: boolean;
}
