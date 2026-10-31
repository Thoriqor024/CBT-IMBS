import test from 'node:test';
import assert from 'node:assert/strict';
import { splitMathText } from '../src/mathTokens.js';
import { detectQuestionImageMime } from './questionMedia.js';

test('math text is split into literal, inline, and display parts without losing prose', () => {
  assert.deepEqual(splitMathText('Hitung \\(2 + 2\\), lalu tulis \\[x^2\\].'), [
    { type: 'text', value: 'Hitung ' },
    { type: 'math', value: '2 + 2', display: false },
    { type: 'text', value: ', lalu tulis ' },
    { type: 'math', value: 'x^2', display: true },
    { type: 'text', value: '.' },
  ]);
});

test('unclosed math delimiters remain plain text', () => {
  assert.deepEqual(splitMathText('Rumus \\(x + 1'), [{ type: 'text', value: 'Rumus \\(x + 1' }]);
});

test('question image type comes from file signatures, not the filename or submitted MIME', () => {
  assert.equal(detectQuestionImageMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'image/png');
  assert.equal(detectQuestionImageMime(Buffer.from([255, 216, 255, 0])), 'image/jpeg');
  assert.equal(detectQuestionImageMime(Buffer.from('RIFF1234WEBPdata')), 'image/webp');
  assert.equal(detectQuestionImageMime(Buffer.from('<svg/>')), null);
});
