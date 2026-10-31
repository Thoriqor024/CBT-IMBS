import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreComplexMC } from './complexMcScoring.js';

test('scoreComplexMC: perfect match gets full points', () => {
  const score = scoreComplexMC('A, C', 'A, C', 10);
  assert.equal(score, 10);
});

test('scoreComplexMC: partial correct with no wrong choices gets proportional score', () => {
  // Key is A, C (2 keys), student answers only A (1 correct)
  // net = 1 - 0 = 1. fraction = 1 / 2 = 0.5. Score = 0.5 * 10 = 5.
  const score = scoreComplexMC('A', 'A, C', 10);
  assert.equal(score, 5);
});

test('scoreComplexMC: partial correct with wrong choice deducts from score (Opsi 2 Skor Parsial ANBK)', () => {
  // Key is A, C (2 keys), student answers A, B (1 correct, 1 wrong)
  // net = max(0, 1 - 1) = 0. Score = 0.
  const score1 = scoreComplexMC('A, B', 'A, C', 10);
  assert.equal(score1, 0);

  // Key is A, B, C (3 keys), student answers A, B, D (2 correct, 1 wrong)
  // net = max(0, 2 - 1) = 1. fraction = 1 / 3 = 0.3333... Score = round(3.333) = 3.33
  const score2 = scoreComplexMC('A, B, D', 'A, B, C', 10);
  assert.equal(score2, 3.33);
});

test('scoreComplexMC: entirely wrong choice returns 0', () => {
  const score = scoreComplexMC('B, D', 'A, C', 10);
  assert.equal(score, 0);
});

test('scoreComplexMC: empty answer or keys returns 0', () => {
  assert.equal(scoreComplexMC('', 'A, C', 10), 0);
  assert.equal(scoreComplexMC('A, C', '', 10), 0);
  assert.equal(scoreComplexMC(null, 'A, C', 10), 0);
});

test('scoreComplexMC: case and whitespace insensitivity', () => {
  const score = scoreComplexMC('a,   c', 'A,C', 5);
  assert.equal(score, 5);
});
