import test from 'node:test';
import assert from 'node:assert/strict';
import { examSessionWindow, formatSessionDateLabel, resolveExamTimeZone } from './examSchedule.js';

const scheduledExam = {
  sessionNumber: 1,
  sessionDate: '2026-11-21',
  sessionStart: '08:00',
  sessionEnd: '10:00',
};

// Asia/Jakarta is UTC+7, so 08:00 local equals 01:00Z.
const jakarta = iso => new Date(iso);

test('requires a complete session schedule before the exam can be run', () => {
  const missingSession = examSessionWindow({ sessionNumber: null, sessionDate: null, sessionStart: null, sessionEnd: null });
  assert.equal(missingSession.configured, false);
  assert.equal(missingSession.open, false);
  assert.equal(missingSession.state, 'missing');
  assert.match(missingSession.message, /Tentukan sesi ujian/);

  const missingEnd = examSessionWindow({ ...scheduledExam, sessionEnd: null });
  assert.equal(missingEnd.configured, false);
  assert.equal(missingEnd.open, false);

  const missingNumber = examSessionWindow({ ...scheduledExam, sessionNumber: null });
  assert.equal(missingNumber.open, false);
});

test('opens only on the session date inside the start–end window', () => {
  assert.equal(examSessionWindow(scheduledExam, { now: jakarta('2026-11-20T01:00:00Z') }).open, false);
  assert.equal(examSessionWindow(scheduledExam, { now: jakarta('2026-11-20T01:00:00Z') }).state, 'before');
  assert.equal(examSessionWindow(scheduledExam, { now: jakarta('2026-11-21T00:59:00Z') }).open, false);
  assert.equal(examSessionWindow(scheduledExam, { now: jakarta('2026-11-21T00:59:00Z') }).state, 'before');
  assert.equal(examSessionWindow(scheduledExam, { now: jakarta('2026-11-21T01:00:00Z') }).open, true);
  assert.equal(examSessionWindow(scheduledExam, { now: jakarta('2026-11-21T01:00:00Z') }).state, 'open');
  assert.equal(examSessionWindow(scheduledExam, { now: jakarta('2026-11-21T02:59:00Z') }).open, true);
  assert.equal(examSessionWindow(scheduledExam, { now: jakarta('2026-11-21T03:00:00Z') }).open, false);
  assert.equal(examSessionWindow(scheduledExam, { now: jakarta('2026-11-21T03:00:00Z') }).state, 'after');
  assert.equal(examSessionWindow(scheduledExam, { now: jakarta('2026-11-22T01:00:00Z') }).open, false);
  assert.equal(examSessionWindow(scheduledExam, { now: jakarta('2026-11-22T01:00:00Z') }).state, 'after');
});

test('explains why an exam outside its schedule cannot be run', () => {
  const before = examSessionWindow(scheduledExam, { now: jakarta('2026-11-20T23:00:00Z') });
  assert.equal(before.open, false);
  assert.match(before.message, /Sabtu, 21 November 2026/);
  assert.match(before.message, /08:00–10:00/);

  const tooEarly = examSessionWindow(scheduledExam, { now: jakarta('2026-11-21T00:30:00Z') });
  assert.match(tooEarly.message, /mulai pukul 08:00/);

  const after = examSessionWindow(scheduledExam, { now: jakarta('2026-11-21T04:00:00Z') });
  assert.match(after.message, /sudah berakhir/);

  const nextDay = examSessionWindow(scheduledExam, { now: jakarta('2026-11-22T02:00:00Z') });
  assert.match(nextDay.message, /sudah berakhir/);
});

test('honours the configured exam time zone', () => {
  const exam = { ...scheduledExam, sessionDate: '2026-11-21' };
  assert.equal(examSessionWindow(exam, { now: new Date('2026-11-21T07:30:00Z'), timeZone: 'UTC' }).open, false);
  assert.equal(examSessionWindow(exam, { now: new Date('2026-11-21T08:00:00Z'), timeZone: 'UTC' }).open, true);
  assert.equal(resolveExamTimeZone('not/a-zone'), 'Asia/Jakarta');
  assert.equal(resolveExamTimeZone('Asia/Makassar'), 'Asia/Makassar');
});

test('formats the session date for schedule messages', () => {
  assert.equal(formatSessionDateLabel('2026-11-21'), 'Sabtu, 21 November 2026');
});
