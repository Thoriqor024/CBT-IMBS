import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeMatchesClass } from './bankTeachers.js';

test('matches teacher classes to the bank grade', () => {
  assert.equal(gradeMatchesClass('VII', 'VII A'), true);
  assert.equal(gradeMatchesClass('VII', 'Kelas VII B'), true);
  assert.equal(gradeMatchesClass('VII', 'VII-A'), true);
  assert.equal(gradeMatchesClass('VIII', 'VIII A'), true);
  assert.equal(gradeMatchesClass('VII', 'VIII A'), false);
  assert.equal(gradeMatchesClass('VII', 'VIIIA'), false);
  assert.equal(gradeMatchesClass('', 'VII A'), false);
  assert.equal(gradeMatchesClass('VII', ''), false);
});
