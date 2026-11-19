import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIdempotencyKey } from './idempotency.js';

test('idempotency key is optional and trimmed when present', () => {
  assert.equal(normalizeIdempotencyKey(undefined), null);
  assert.equal(normalizeIdempotencyKey(null), null);
  assert.equal(normalizeIdempotencyKey('   '), null);
  assert.equal(normalizeIdempotencyKey('  submit-12345678  '), 'submit-12345678');
});

test('idempotency key accepts UUIDs and safe request tokens', () => {
  assert.equal(
    normalizeIdempotencyKey('9f1c2d3e-4a5b-6c7d-8e9f-0123456789ab'),
    '9f1c2d3e-4a5b-6c7d-8e9f-0123456789ab'
  );
  assert.equal(normalizeIdempotencyKey('submit_2026:11:19.001'), 'submit_2026:11:19.001');
});

test('idempotency key rejects short, long, and unsafe values', () => {
  for (const value of ['short', 'a'.repeat(129), 'has space', 'slash/key', 'line\nbreak']) {
    assert.throws(() => normalizeIdempotencyKey(value), error => {
      assert.equal(error.status, 400);
      return true;
    });
  }
});
