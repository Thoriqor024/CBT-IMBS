import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARABIC_KEYBOARD_ROWS,
  ARABIC_HARAKAT,
  resolveArabicKeyPress,
  isRtlContext,
} from './arabicKeyboardData.js';

test('Arabic keyboard rows contain valid Arabic values and mapping', () => {
  assert.ok(Array.isArray(ARABIC_KEYBOARD_ROWS) && ARABIC_KEYBOARD_ROWS.length === 5, 'Should have 5 keyboard rows');

  // Row 2: QWERTY -> ض ص ث ق ف غ ع ه خ ح ج د
  const row2 = ARABIC_KEYBOARD_ROWS[1];
  const qKey = row2.find(k => k.key === 'q');
  assert.ok(qKey, 'q key should exist in row 2');
  assert.equal(qKey.value, 'ض', 'q key must map to Arabic character Dhad (ض)');

  const wKey = row2.find(k => k.key === 'w');
  assert.equal(wKey.value, 'ص', 'w key must map to Arabic character Sad (ص)');

  // Row 3: A -> ش, S -> س
  const row3 = ARABIC_KEYBOARD_ROWS[2];
  const aKey = row3.find(k => k.key === 'a');
  assert.equal(aKey.value, 'ش', 'a key must map to Arabic character Sheen (ش)');

  const sKey = row3.find(k => k.key === 's');
  assert.equal(sKey.value, 'س', 's key must map to Arabic character Seen (س)');

  // Space key
  const row5 = ARABIC_KEYBOARD_ROWS[4];
  const spaceKey = row5.find(k => k.special === 'space');
  assert.ok(spaceKey, 'Space key should exist');
  assert.equal(spaceKey.label, 'مسافة');
  assert.equal(spaceKey.value, ' ');
});

test('Arabic keyboard press logic sends Arabic value instead of Latin key', () => {
  const qKey = ARABIC_KEYBOARD_ROWS[1].find(k => k.key === 'q');

  // Normal click: should insert Arabic 'ض', NOT Latin 'q'
  const normalRes = resolveArabicKeyPress(qKey, false);
  assert.equal(normalRes.type, 'char');
  assert.equal(normalRes.value, 'ض', 'Normal click on q key must yield Arabic ض');
  assert.notEqual(normalRes.value, 'q', 'Must NOT yield Indonesian/Latin alphabet q');

  // Shift click: should insert Fathah mark
  const shiftRes = resolveArabicKeyPress(qKey, true);
  assert.equal(shiftRes.type, 'mark');
  assert.equal(shiftRes.value, '\u064E', 'Shift+Q must yield Fathah combining mark');
});

test('RTL direction detection correctly identifies Arabic text and subjects', () => {
  assert.equal(isRtlContext('ar', 'rtl', ''), true);
  assert.equal(isRtlContext('ar', 'auto', ''), true);
  assert.equal(isRtlContext('id', 'rtl', ''), true);
  assert.equal(isRtlContext('id', 'auto', ''), false);

  assert.equal(isRtlContext('id', 'auto', 'كتاب'), true);
  assert.equal(isRtlContext('id', 'auto', 'buku pelajaran'), false);
  assert.equal(isRtlContext('id', 'auto', 'Jawaban: ض'), true);
});

