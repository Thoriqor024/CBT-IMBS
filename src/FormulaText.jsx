import { useEffect, useMemo, useState } from 'react';
import { splitMathText } from './mathTokens.js';

let katexPromise;
function loadKatex() {
  katexPromise ||= import('katex').then(module => module.default || module);
  return katexPromise;
}

export function FormulaText({ children, className = '' }) {
  const parts = useMemo(() => splitMathText(children), [children]);
  const hasMath = parts.some(part => part.type === 'math');
  const [renderer, setRenderer] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (hasMath && !renderer) loadKatex().then(value => { if (mounted) setRenderer(() => value); }).catch(() => {});
    return () => { mounted = false; };
  }, [hasMath, renderer]);

  return <span className={`formula-text ${className}`.trim()}>{parts.map((part, index) => {
    if (part.type === 'text') return <span key={index}>{part.value}</span>;
    if (!renderer) return <span key={index} className="math-source" dir="ltr">{part.display ? `\\[${part.value}\\]` : `\\(${part.value}\\)`}</span>;
    const html = renderer.renderToString(part.value, {
      displayMode: part.display,
      output: 'htmlAndMathml',
      throwOnError: false,
      trust: false,
      maxSize: 20,
      maxExpand: 100,
    });
    return <span key={index} className="math-expression" dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />;
  })}</span>;
}
