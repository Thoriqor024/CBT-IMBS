import test from 'node:test';
import assert from 'node:assert/strict';
import { buildClassTransferPlan } from './studentClassTransfer.js';

const student = (id, name, className) => ({ id, name, username: `siswa${id}`, className });
const placement = (studentId, roomId, name, quotas, targetCount) => ({ studentId, roomId, name, quotas, targetCount });

test('keeps placements in rooms that cover the target class and removes the rest', () => {
  const plan = buildClassTransferPlan({
    targetClass: 'KELAS 2A',
    students: [student(1, 'Ahmad', 'KELAS 1A'), student(2, 'Bilal', 'KELAS 1B')],
    placements: [
      placement(1, 10, 'Ruang 01', [{ className: 'KELAS 1A', count: 20 }, { className: 'KELAS 2A', count: 2 }], 0),
      placement(2, 11, 'Ruang 02', [{ className: 'KELAS 1B', count: 20 }], 0),
    ],
    activeStudentIds: [],
  });

  assert.equal(plan.students[0].status, 'will_move');
  assert.deepEqual(plan.students[0].roomChanges, [{ roomId: 10, name: 'Ruang 01', action: 'updated' }]);
  assert.equal(plan.students[0].unassigned, false);
  assert.deepEqual(plan.students[1].roomChanges, [{ roomId: 11, name: 'Ruang 02', action: 'removed' }]);
  assert.equal(plan.students[1].unassigned, true);
  assert.deepEqual(plan.summary, {
    selected: 2,
    willMove: 2,
    unchanged: 0,
    blocked: 0,
    roomUpdates: 1,
    roomRemovals: 1,
    unassigned: 1,
  });
});

test('shares remaining room capacity across the batch and skips unchanged students', () => {
  const plan = buildClassTransferPlan({
    targetClass: '2A',
    students: [student(1, 'Ahmad', '1A'), student(2, 'Bilal', '1B'), student(3, 'Citra', '2A')],
    placements: [
      placement(1, 10, 'Ruang 01', [{ className: '2A', count: 2 }], 1),
      placement(2, 10, 'Ruang 01', [{ className: '2A', count: 2 }], 1),
      placement(3, 10, 'Ruang 01', [{ className: '2A', count: 2 }], 1),
    ],
    activeStudentIds: [],
  });

  assert.equal(plan.students[0].roomChanges[0].action, 'updated');
  assert.equal(plan.students[1].roomChanges[0].action, 'removed');
  assert.equal(plan.students[2].status, 'unchanged');
  assert.equal(plan.summary.roomUpdates, 1);
  assert.equal(plan.summary.roomRemovals, 1);
  assert.equal(plan.summary.unassigned, 1);
});

test('blocks students with an active exam and marks students without rooms as unassigned', () => {
  const plan = buildClassTransferPlan({
    targetClass: '2A',
    students: [student(1, 'Ahmad', '1A'), student(2, 'Bilal', '1B')],
    placements: [],
    activeStudentIds: [1],
  });

  assert.equal(plan.students[0].status, 'blocked');
  assert.match(plan.students[0].reason, /ujian aktif/);
  assert.equal(plan.students[1].status, 'will_move');
  assert.equal(plan.students[1].unassigned, true);
  assert.equal(plan.summary.blocked, 1);
  assert.equal(plan.summary.unassigned, 1);
});
