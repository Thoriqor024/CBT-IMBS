import test from 'node:test';
import assert from 'node:assert/strict';
import { matchBankGrade, normalizeRoomQuotas } from './examRooms.js';

test('normalizes room quotas, trims class names, and preserves order', () => {
  assert.deepEqual(
    normalizeRoomQuotas(
      [{ className: ' VII A ', quota: '15' }, { className: 'VIII A', count: 10 }],
      ['VII A', 'VIII A', 'IX A'],
    ),
    [{ className: 'VII A', count: 15 }, { className: 'VIII A', count: 10 }],
  );
});

test('rejects room quotas with unknown, duplicate, or empty classes', () => {
  assert.throws(() => normalizeRoomQuotas([{ className: 'VII Z', count: 5 }], ['VII A']), /tidak ada di Pengaturan/);
  assert.throws(() => normalizeRoomQuotas([{ className: 'VII A', count: 5 }, { className: 'VII A', count: 3 }], ['VII A']), /lebih dari sekali/);
  assert.throws(() => normalizeRoomQuotas([{ className: '', count: 5 }], ['VII A']), /harus memiliki kelas/);
});

test('rejects invalid quotas and an all-zero allocation', () => {
  assert.throws(() => normalizeRoomQuotas([{ className: 'VII A', count: -1 }], ['VII A']), /bilangan bulat/);
  assert.throws(() => normalizeRoomQuotas([{ className: 'VII A', count: 1.5 }], ['VII A']), /bilangan bulat/);
  assert.throws(() => normalizeRoomQuotas([{ className: 'VII A', count: 0 }], ['VII A']), /minimal 1 siswa/);
  assert.throws(() => normalizeRoomQuotas([], ['VII A']), /minimal satu kelas/);
});

test('matches participant class names to the longest configured bank grade', () => {
  assert.equal(matchBankGrade('VII A', ['VII', 'VIII']), 'VII');
  assert.equal(matchBankGrade('KELAS 8-A', ['7', '8']), '8');
  assert.equal(matchBankGrade('KELAS 1A', ['1', '2']), '1');
  assert.equal(matchBankGrade('kelas 10b', ['1', '10']), '10');
  assert.equal(matchBankGrade('11A', ['1', '11']), '11');
  assert.equal(matchBankGrade('11A', ['1']), null);
  assert.equal(matchBankGrade('Kelas VII A', ['VII', 'VIII']), 'VII');
  assert.equal(matchBankGrade('VII A', ['VII A', 'VII']), 'VII A');
  assert.equal(matchBankGrade('X IPA 1', ['VII', 'VIII']), null);
});
