import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateItemDifficulty } from './itemAnalysis.js';

test('categorizes difficulty based on correct / assigned ratio', () => {
  // Easy: P >= 0.70
  assert.deepEqual(calculateItemDifficulty(10, 8), { difficultyIndex: 0.8, difficulty: 'Mudah' });
  assert.deepEqual(calculateItemDifficulty(10, 7), { difficultyIndex: 0.7, difficulty: 'Mudah' });

  // Medium: 0.30 <= P < 0.70
  assert.deepEqual(calculateItemDifficulty(10, 5), { difficultyIndex: 0.5, difficulty: 'Sedang' });
  assert.deepEqual(calculateItemDifficulty(10, 3), { difficultyIndex: 0.3, difficulty: 'Sedang' });

  // Hard: P < 0.30
  assert.deepEqual(calculateItemDifficulty(10, 2), { difficultyIndex: 0.2, difficulty: 'Sukar' });
  assert.deepEqual(calculateItemDifficulty(10, 0), { difficultyIndex: 0.0, difficulty: 'Sukar' });
});

test('handles zero or invalid participant count safely', () => {
  assert.deepEqual(calculateItemDifficulty(0, 0), { difficultyIndex: 0, difficulty: 'Belum diuji' });
  assert.deepEqual(calculateItemDifficulty(-5, 2), { difficultyIndex: 0, difficulty: 'Belum diuji' });
});

