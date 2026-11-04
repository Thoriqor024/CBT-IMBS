export const ARABIC_HARAKAT = {
  q: '\u064E', // Fathah
  w: '\u064B', // Fathatayn (Tanwin Fathah)
  e: '\u064F', // Dammah
  r: '\u064C', // Dammatayn (Tanwin Dammah)
  a: '\u0650', // Kasrah
  s: '\u064D', // Kasratayn (Tanwin Kasrah)
  x: '\u0652', // Sukun
  '`': '\u0651', // Tasydid / Shaddah
  '~': '\u0651', // Tasydid / Shaddah
};

export const ARABIC_KEYBOARD_ROWS = [
  [
    { key: '`', label: '`', value: '\u0630' },
    ...['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='].map(key => ({ key, label: key, value: key })),
    { special: 'backspace', label: '⌫' },
  ],
  [
    { special: 'tab', label: 'TAB' },
    ...['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'].map((key, index) => ({
      key,
      label: key,
      value: ['\u0636', '\u0635', '\u062b', '\u0642', '\u0641', '\u063a', '\u0639', '\u0647', '\u062e', '\u062d', '\u062c', '\u062f', '\\'][index],
    })),
  ],
  [
    { special: 'caps', label: 'CAPS' },
    ...['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\''].map((key, index) => ({
      key,
      label: key,
      value: ['\u0634', '\u0633', '\u064a', '\u0628', '\u0644', '\u0627', '\u062a', '\u0646', '\u0645', '\u0643', '\u0637'][index],
    })),
    { special: 'enter', label: 'ENTER' },
  ],
  [
    { special: 'shift', label: 'SHIFT' },
    ...['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'].map((key, index) => ({
      key,
      label: key,
      value: ['\u0626', '\u0621', '\u0624', '\u0631', '\u0644\u0627', '\u0649', '\u0629', '\u0648', '\u0632', '\u0638'][index],
    })),
    { special: 'shift', label: 'SHIFT' },
  ],
  [{ special: 'space', label: 'مسافة', value: ' ' }],
];

/**
 * Resolves character to insert when a key on the Arabic keyboard is pressed.
 *
 * @param {object} item - The keyboard key item
 * @param {boolean} shiftActive - Whether Shift is active
 * @returns {{ type: 'mark' | 'char', value: string }}
 */
export function resolveArabicKeyPress(item, shiftActive = false) {
  if (shiftActive && item.key && ARABIC_HARAKAT[item.key]) {
    return { type: 'mark', value: ARABIC_HARAKAT[item.key] };
  }
  const char = item.value !== undefined ? item.value : item.key;
  return { type: 'char', value: char || '' };
}

/**
 * Determines whether text or subject context should be rendered in RTL mode.
 *
 * @param {string} languageCode
 * @param {string} textDirection
 * @param {string} [text]
 * @returns {boolean}
 */
export function isRtlContext(languageCode = '', textDirection = '', text = '') {
  if (languageCode === 'ar' || textDirection === 'rtl') return true;
  return /[\u0600-\u06FF]/.test(text || '');
}

