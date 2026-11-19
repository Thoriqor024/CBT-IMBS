const CLASS_PREFIX = /^(kelas|kls|class)\s*[-:]?\s*/i;

const escapeRegex = value => String(value).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

export function normalizeClassName(value) {
  return String(value ?? '').trim().replace(CLASS_PREFIX, '');
}

export function classMatchesGrade(className, grade) {
  const normalizedClass = normalizeClassName(className);
  const normalizedGrade = String(grade ?? '').trim();
  if (!normalizedClass || !normalizedGrade) return false;
  const classKey = normalizedClass.toLowerCase();
  const gradeKey = normalizedGrade.toLowerCase();
  if (classKey === gradeKey) return true;
  if (!classKey.startsWith(gradeKey)) return false;
  const next = normalizedClass.charAt(normalizedGrade.length);
  return next === ' '
    || next === '-'
    || (/\d$/.test(normalizedGrade) && /[A-Za-z]/.test(next));
}

export function matchBankGrade(className, grades) {
  const ordered = [...new Set((grades || []).map(grade => String(grade).trim()).filter(Boolean))]
    .sort((left, right) => right.length - left.length);
  const prefixMatch = ordered.find(grade => classMatchesGrade(className, grade));
  if (prefixMatch) return prefixMatch;
  const normalized = String(className || '').trim();
  if (!normalized || !ordered.length) return null;
  return ordered.find(grade => new RegExp('(^|[^a-zA-Z0-9])' + escapeRegex(grade) + '([^a-zA-Z0-9]|$)', 'i').test(normalized)) || null;
}
