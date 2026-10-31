import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedAccounts, isLegacyBootstrapSeedEnabled, isSecurePlatformOwnerPassword } from './seedAccounts.js';

test('buildSeedAccounts never seeds a platform owner from the demo fallback', () => {
  const accounts = buildSeedAccounts({
    SEED_ADMIN_PASSWORD: 'admin123',
    SEED_TEACHER_PASSWORD: 'guru123',
    SEED_PLATFORM_OWNER_PASSWORD: 'platform-owner-local',
  });

  assert.deepEqual(
    accounts.map(([username, _name, role, _password, _className]) => ({ username, role })),
    [
      { username: 'admin', role: 'admin' },
      { username: 'guru', role: 'teacher' },
    ],
  );
});

test('buildSeedAccounts adds a platform owner only with a deliberate strong password', () => {
  const accounts = buildSeedAccounts({ SEED_PLATFORM_OWNER_PASSWORD: 'a'.repeat(32) });
  const platformOwner = accounts.find(([, , role]) => role === 'platform_owner');

  assert.ok(platformOwner);
  assert.equal(platformOwner[3], 'a'.repeat(32));
  assert.equal(isSecurePlatformOwnerPassword('short'), false);
  assert.equal(isSecurePlatformOwnerPassword('platform-owner-local'), false);
  assert.equal(isSecurePlatformOwnerPassword(' '.repeat(32)), false);
});

test('legacy bootstrap seeding can be disabled for a data-preserving runtime rebuild', () => {
  assert.equal(isLegacyBootstrapSeedEnabled({ LEGACY_BOOTSTRAP_SEED_ENABLED: 'false' }), false);
  assert.equal(isLegacyBootstrapSeedEnabled({}), true);
});
