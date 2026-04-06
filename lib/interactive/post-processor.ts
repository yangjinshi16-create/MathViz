export function postProcessInteractiveHtml(html: string): string {
  let processed = convertLatexDelimiters(html);
  if (!processed.toLowerCase().includes('katex')) {
    processed = injectKatex(processed);
  }
  return processed;
}

function convertLatexDelimiters(html: string): string {
  const scriptBlocks: string[] = [];
  let processed = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, (match) => {
    scriptBlocks.push(match);
    return `__SCRIPT_BLOCK_${scriptBlocks.length - 1}__`;
  });
  processed = processed.replace(/\$\$([^$]+)\$\$/g, '\\[$1\\]');
  processed = processed.replace(/\$([^$\n]+?)\$/g, '\\($1\\)');
  for (let i = 0; i < scriptBlocks.length; i++) {
    processed = processed.replace(`__SCRIPT_BLOCK_${i}__`, scriptBlocks[i]);
  }
  return processed;
}

function injectKatex(html: string): string {
  const katexInjection = `
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function() {
  const options = {
    delimiters: [
      {left: '\\\\[', right: '\\\\]', display: true},
      {left: '\\\\(', right: '\\\\)', display: false},
      {left: '$$', right: '$$', display: true},
      {left: '$', right: '$', display: false}
    ],
    throwOnError: false,
    strict: false,
    trust: true
  };
  renderMathInElement(document.body, options);
  const observer = new MutationObserver(() => renderMathInElement(document.body, options));
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
});
</script>`;

  const headCloseIdx = html.indexOf('</head>');
  if (headCloseIdx !== -1) {
    return `${html.substring(0, headCloseIdx)}${katexInjection}\n</head>${html.substring(headCloseIdx + 7)}`;
  }
  const bodyCloseIdx = html.indexOf('</body>');
  if (bodyCloseIdx !== -1) {
    return `${html.substring(0, bodyCloseIdx)}${katexInjection}\n</body>${html.substring(bodyCloseIdx + 7)}`;
  }
  return `${html}${katexInjection}`;
}
