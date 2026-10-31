const MATH_DELIMITERS = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;

export function splitMathText(value) {
  const text = String(value ?? '');
  const parts = [];
  let cursor = 0;

  for (const match of text.matchAll(MATH_DELIMITERS)) {
    if (match.index > cursor) parts.push({ type: 'text', value: text.slice(cursor, match.index) });
    const display = match[1] !== undefined;
    parts.push({ type: 'math', value: (display ? match[1] : match[2]).trim(), display });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) parts.push({ type: 'text', value: text.slice(cursor) });
  return parts.length ? parts : [{ type: 'text', value: text }];
}
