import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAccountEmail } from './userIdentity.js';

test('normalizes account email and permits an omitted legacy email', () => {
  assert.equal(normalizeAccountEmail('  Guru@Sekolah.ID  '), 'guru@sekolah.id');
  assert.equal(normalizeAccountEmail(''), null);
});

test('requires valid email when tenant account creation requests it', () => {
  assert.throws(() => normalizeAccountEmail('', { required: true }), { status: 400 });
  assert.throws(() => normalizeAccountEmail('not-an-email', { required: true }), { status: 400 });
  assert.throws(() => normalizeAccountEmail(`${'a'.repeat(245)}@school.id`, { required: true }), { status: 400 });
});