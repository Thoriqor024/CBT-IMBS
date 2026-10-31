import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSubjectInput } from './subjectValidation.js';

test('validates valid subject input with defaults', () => {
  const result = validateSubjectInput({ name: ' Matematika ' });
  assert.deepEqual(result, {
    name: 'Matematika',
    languageCode: 'id',
    textDirection: 'auto',
  });
});

test('validates custom language code and RTL direction', () => {
  const result = validateSubjectInput({
    name: 'Bahasa Arab',
    languageCode: 'AR',
    textDirection: 'RTL',
  });
  assert.deepEqual(result, {
    name: 'Bahasa Arab',
    languageCode: 'ar',
    textDirection: 'rtl',
  });
});

test('rejects missing or empty subject name', () => {
  assert.throws(() => validateSubjectInput({ name: '   ' }), {
    message: 'Nama mata pelajaran wajib diisi dan maksimal 100 karakter.',
    status: 400,
  });
  assert.throws(() => validateSubjectInput({ name: '' }), {
    message: 'Nama mata pelajaran wajib diisi dan maksimal 100 karakter.',
    status: 400,
  });
});

test('rejects subject name longer than 100 characters', () => {
  assert.throws(() => validateSubjectInput({ name: 'X'.repeat(101) }), {
    message: 'Nama mata pelajaran wajib diisi dan maksimal 100 karakter.',
    status: 400,
  });
});

test('rejects invalid language codes', () => {
  assert.throws(() => validateSubjectInput({ name: 'Fisika', languageCode: 'invalid_code!' }), {
    message: 'Kode bahasa tidak valid.',
    status: 400,
  });
});

test('rejects invalid text directions', () => {
  assert.throws(() => validateSubjectInput({ name: 'Fisika', textDirection: 'diagonal' }), {
    message: 'Arah teks harus otomatis, LTR, atau RTL.',
    status: 400,
  });
});

