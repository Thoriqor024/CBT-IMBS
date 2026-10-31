import test from 'node:test';
import assert from 'node:assert/strict';
import { gradesForTeacherClasses, hasTeacherGrant } from './teacherAccess.js';

test('maps assigned class names to the longest configured grade prefix', () => {
  assert.deepEqual(
    gradesForTeacherClasses(['VII A', 'VII-B', 'VIII C', 'Club Math'], ['VII', 'VIII', 'VII A']),
    ['VII A', 'VII', 'VIII'],
  );
});

test('requires both the assigned subject and exact class for teacher access', () => {
  const grants = [
    { subjectId: 2, className: 'VII A' },
    { subjectId: 3, className: 'VIII B' },
  ];
  assert.equal(hasTeacherGrant(grants, 2, 'VII A'), true);
  assert.equal(hasTeacherGrant(grants, 2, 'VII B'), false);
  assert.equal(hasTeacherGrant(grants, 3, 'VII A'), false);
});
