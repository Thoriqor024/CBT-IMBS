import test from 'node:test';
import assert from 'node:assert/strict';
import { detectSchoolCodeFromHost, getInitialSchoolCode, saveLastSchoolCode } from './tenantDiscovery.js';

test('detectSchoolCodeFromHost extracts valid subdomain school codes', () => {
  assert.equal(detectSchoolCodeFromHost('sekolah-a.cbtimbs.com'), 'sekolah-a');
  assert.equal(detectSchoolCodeFromHost('smp1.cbtimbs.com:8443'), 'smp1');
  assert.equal(detectSchoolCodeFromHost('demo.localhost'), 'demo');
  assert.equal(detectSchoolCodeFromHost('school1.cbt.domain.co.id'), 'school1');
});

test('detectSchoolCodeFromHost ignores root domains, ips, and generic prefixes', () => {
  assert.equal(detectSchoolCodeFromHost('10.10.4.235'), '');
  assert.equal(detectSchoolCodeFromHost('127.0.0.1:8080'), '');
  assert.equal(detectSchoolCodeFromHost('localhost'), '');
  assert.equal(detectSchoolCodeFromHost('cbtimbs.com'), '');
  assert.equal(detectSchoolCodeFromHost('www.cbtimbs.com'), '');
  assert.equal(detectSchoolCodeFromHost('api.cbtimbs.com'), '');
  assert.equal(detectSchoolCodeFromHost('app.cbtimbs.com'), '');
  assert.equal(detectSchoolCodeFromHost(''), '');
  assert.equal(detectSchoolCodeFromHost(null), '');
});

test('getInitialSchoolCode prioritizes subdomain then localStorage', () => {
  const mockStorage = {
    data: { cbt_last_school_code: 'saved-school' },
    getItem(key) { return this.data[key] || null; },
    setItem(key, val) { this.data[key] = val; },
  };

  // Subdomain takes precedence
  assert.equal(getInitialSchoolCode(mockStorage, 'sub.cbtimbs.com'), 'sub');

  // Fallback to storage when host has no subdomain
  assert.equal(getInitialSchoolCode(mockStorage, '10.10.4.235'), 'saved-school');
  assert.equal(getInitialSchoolCode(mockStorage, 'cbtimbs.com'), 'saved-school');

  // Empty fallback if storage is empty
  const emptyStorage = { getItem() { return null; } };
  assert.equal(getInitialSchoolCode(emptyStorage, '10.10.4.235'), '');
});

test('saveLastSchoolCode persists normalized code', () => {
  const store = {};
  const mockStorage = {
    setItem(k, v) { store[k] = v; },
  };

  saveLastSchoolCode('  SMA-Demo-1  ', mockStorage);
  assert.equal(store.cbt_last_school_code, 'sma-demo-1');

  saveLastSchoolCode('', mockStorage);
  assert.equal(store.cbt_last_school_code, 'sma-demo-1');
});

