import {
  interactiveHtmlSystem,
  interactiveHtmlUser,
  repairSystem,
  repairUser,
  scientificModelSystem,
  scientificModelUser,
} from './prompt-templates';
import type { BuildPromptResult, InteractiveAgentDependencies } from './types';

function render(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
}

export function buildPrompt(
  promptId: 'interactive-scientific-model' | 'interactive-html' | 'interactive-html-repair',
  variables: Record<string, unknown>,
): BuildPromptResult {
  if (promptId === 'interactive-scientific-model') {
    return { system: scientificModelSystem, user: render(scientificModelUser, variables) };
  }
  if (promptId === 'interactive-html') {
    return { system: interactiveHtmlSystem, user: render(interactiveHtmlUser, variables) };
  }
  return { system: repairSystem, user: render(repairUser, variables) };
}

export const defaultDepsBuildPrompt: InteractiveAgentDependencies['buildPrompt'] = (id, vars) =>
  buildPrompt(id, vars);
