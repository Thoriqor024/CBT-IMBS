import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareAccountProfile } from './accountProfile.js';

test('trims a profile name and permits a name-only update', () => {
  assert.deepEqual(prepareAccountProfile({ name: '  Guru Bahasa Arab  ' }), {
    name: 'Guru Bahasa Arab',
    currentPassword: '',
    newPassword: '',
    passwordRequested: false,
  });
});

test('requires current, new, and confirmation passwords together', () => {
  assert.throws(() => prepareAccountProfile({ name: 'Admin', newPassword: 'password-baru' }), {
    message: 'Isi password saat ini, password baru, dan konfirmasi password.',
    status: 400,
  });
});

test('enforces password length and confirmation', () => {
  assert.throws(() => prepareAccountProfile({ name: 'Admin', currentPassword: 'old', newPassword: 'short', confirmPassword: 'short' }), {
    message: 'Password baru harus berisi 8–128 karakter.',
  });
  assert.throws(() => prepareAccountProfile({ name: 'Admin', currentPassword: 'old', newPassword: 'new-password', confirmPassword: 'different-password' }), {
    message: 'Konfirmasi password baru tidak cocok.',
  });
});

test('rejects blank or overlong profile names', () => {
  assert.throws(() => prepareAccountProfile({ name: '  ' }), /Nama wajib diisi/);
  assert.throws(() => prepareAccountProfile({ name: 'a'.repeat(121) }), /maksimal 120 karakter/);
});