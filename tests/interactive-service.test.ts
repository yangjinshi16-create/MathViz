import { describe, expect, it } from 'vitest';
import { generateInteractivePage } from '../lib/interactive/service';
import type { InteractiveAgentDependencies } from '../lib/interactive/types';

function createDeps(aiCall: InteractiveAgentDependencies['aiCall']): InteractiveAgentDependencies {
  return {
    aiCall,
    buildPrompt: (promptId, variables) => ({ system: promptId, user: JSON.stringify(variables) }),
    parseJsonResponse: <T>(text: string) => {
      try {
        return JSON.parse(text) as T;
      } catch {
        return null;
      }
    },
    postProcessHtml: (html: string) => html,
  };
}

describe('standalone interactive service', () => {
  it('auto repairs invalid html once', async () => {
    const deps = createDeps(async (systemPrompt) => {
      if (systemPrompt === 'interactive-scientific-model') {
        return JSON.stringify({ core_formulas: ['F=ma'], mechanism: [], constraints: [], forbidden_errors: [] });
      }
      if (systemPrompt === 'interactive-html') {
        return '<!DOCTYPE html><html><head></head><body>bad</body></html>';
      }
      return `<!DOCTYPE html><html><head><script src="https://cdn.tailwindcss.com"></script></head><body><button id="play">play</button><canvas id="c"></canvas><script>const c=document.getElementById('c');const x=c.getContext('2d');function r(){c.width=320;c.height=180;}window.addEventListener('resize',r);r();let t=0;function loop(){t+=0.01;x.clearRect(0,0,c.width,c.height);x.fillRect((Math.sin(t)+1)*120,80,20,20);requestAnimationFrame(loop)}requestAnimationFrame(loop);</script></body></html>`;
    });

    const result = await generateInteractivePage({ conceptName: '简谐运动' }, deps);
    expect(result.diagnostics.valid).toBe(true);
    expect(result.html.includes('requestAnimationFrame')).toBe(true);
  });
});
