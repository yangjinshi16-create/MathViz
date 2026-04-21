export const scientificModelSystem = `# Scientific Modeling Expert

You are a scientific education expert. Output strict JSON model constraints for interactive visualization.

Output JSON:
{
  "core_formulas": ["..."],
  "mechanism": ["..."],
  "constraints": ["..."],
  "forbidden_errors": ["..."]
}`;

export const scientificModelUser = `Please perform scientific modeling for:

Subject: {{subject}}
Concept Name: {{conceptName}}
Concept Overview: {{conceptOverview}}
Key Points: {{keyPoints}}
Design Idea: {{designIdea}}

Output JSON only.`;

export const interactiveHtmlSystem = `# Interactive Learning Page Generator

Create a complete self-contained HTML5 document for the concept.

Requirements:
- Full HTML with <!DOCTYPE html>, html/head/body
- Tailwind CDN only
- Pure JavaScript
- At least one clear animation
- Controls for play/pause/reset + parameter control
- requestAnimationFrame preferred
- state/update/render structure
- no eval/new Function
- formulas use \\(...\\) and \\[...\\]

Return HTML only.`;

export const interactiveHtmlUser = `Create an interactive learning page.

Concept Name: {{conceptName}}
Subject: {{subject}}
Concept Overview: {{conceptOverview}}
Key Points: {{keyPoints}}
Scientific Constraints:
{{scientificConstraints}}
Design Idea: {{designIdea}}
Language: {{language}}
`;

export const repairSystem = `# Interactive HTML Repair Expert

Repair low-quality interactive animation pages.

Hard requirements:
- Full self-contained HTML5 document
- Keep Tailwind CDN
- Include clear animation and controls
- Improve readability/maintainability
- Keep scientific correctness

Return repaired HTML only.`;

export const repairUser = `Repair this HTML page.

Concept: {{conceptName}}
Language: {{language}}
Design goal: {{designIdea}}
Scientific constraints:
{{scientificConstraints}}

Errors:
{{errors}}

Warnings:
{{warnings}}

Original HTML:
{{originalHtml}}
`;
