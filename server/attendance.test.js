import test from 'node:test';
import assert from 'node:assert/strict';
import { canExportAttendance, summarizeAttendance } from './attendance.js';

test('counts students who entered the exam PIN as present and the rest as absent', () => {
  const students = [
    { startedAt: '2026-11-19T01:00:00.000Z', status: 'in_progress' },
    { startedAt: null, status: 'not_started' },
    { startedAt: '2026-11-19T01:05:00.000Z', status: 'locked' },
  ];
  assert.deepEqual(summarizeAttendance(students), { present: 2, absent: 1, total: 3 });
});

test('allows export only after the exam is completed and no session is still running', () => {
  const finished = [{ startedAt: '2026-11-19T01:00:00.000Z', status: 'completed' }];
  assert.equal(canExportAttendance('completed', finished), true);
  assert.equal(canExportAttendance('active', finished), false);
  assert.equal(canExportAttendance('completed', [{ startedAt: null, status: 'not_started' }]), true);
  assert.equal(canExportAttendance('completed', [{ startedAt: '2026-11-19T01:00:00.000Z', status: 'in_progress' }]), false);
  assert.equal(canExportAttendance('completed', []), false);
});
