import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertStudentQuota,
  assertStudentQuotaInTransaction,
  assertTeacherQuota,
  assertTeacherQuotaInTransaction,
} from './tenantQuota.js';

test('assertStudentQuota permits additions within student quota limit', () => {
  assert.doesNotThrow(() => assertStudentQuota({ currentCount: 10, additionalCount: 1, maxStudents: 50 }));
  assert.doesNotThrow(() => assertStudentQuota({ currentCount: 49, additionalCount: 1, maxStudents: 50 }));
  assert.doesNotThrow(() => assertStudentQuota({ currentCount: 30, additionalCount: 20, maxStudents: 50 }));
});

test('assertStudentQuota rejects addition exceeding student quota limit', () => {
  assert.throws(
    () => assertStudentQuota({ currentCount: 50, additionalCount: 1, maxStudents: 50 }),
    err => err.status === 403 && err.code === 'TENANT_STUDENT_QUOTA_EXCEEDED' && err.message.includes('penuh')
  );

  assert.throws(
    () => assertStudentQuota({ currentCount: 45, additionalCount: 10, maxStudents: 50 }),
    err => err.status === 403 && err.code === 'TENANT_STUDENT_QUOTA_EXCEEDED' && err.message.includes('tidak mencukupi')
  );
});

test('assertTeacherQuota permits additions within teacher quota limit', () => {
  assert.doesNotThrow(() => assertTeacherQuota({ currentCount: 5, additionalCount: 1, maxTeachers: 10 }));
  assert.doesNotThrow(() => assertTeacherQuota({ currentCount: 9, additionalCount: 1, maxTeachers: 10 }));
});

test('assertTeacherQuota rejects addition exceeding teacher quota limit', () => {
  assert.throws(
    () => assertTeacherQuota({ currentCount: 10, additionalCount: 1, maxTeachers: 10 }),
    err => err.status === 403 && err.code === 'TENANT_TEACHER_QUOTA_EXCEEDED' && err.message.includes('penuh')
  );
});

test('quota assertion ignores invalid or unconfigured limits gracefully', () => {
  assert.doesNotThrow(() => assertStudentQuota({ currentCount: 100, maxStudents: null }));
  assert.doesNotThrow(() => assertStudentQuota({ currentCount: 100, maxStudents: 0 }));
  assert.doesNotThrow(() => assertTeacherQuota({ currentCount: 100, maxTeachers: undefined }));
});

test('student quota check locks the school row before counting active students', async () => {
  const queries = [];
  const client = { query: async query => {
    queries.push(query);
    return query.includes('count(*)') ? { rows: [{ count: 9 }] } : { rows: [] };
  } };

  await assertStudentQuotaInTransaction(client, { maxStudents: 10 });

  assert.match(queries[0], /FOR UPDATE/);
  assert.match(queries[1], /role='student'/);
});

test('teacher quota check rejects an over-limit import after acquiring the school row lock', async () => {
  const queries = [];
  const client = { query: async query => {
    queries.push(query);
    return query.includes('count(*)') ? { rows: [{ count: 9 }] } : { rows: [] };
  } };

  await assert.rejects(
    assertTeacherQuotaInTransaction(client, { additionalCount: 2, maxTeachers: 10 }),
    error => error.code === 'TENANT_TEACHER_QUOTA_EXCEEDED'
  );

  assert.match(queries[0], /FOR UPDATE/);
  assert.match(queries[1], /role IN \('teacher','pengawas'\)/);
});

