export function buildSeedAccounts(env = process.env) {
  const adminPassword = String(env.SEED_ADMIN_PASSWORD || 'admin123');
  const teacherPassword = String(env.SEED_TEACHER_PASSWORD || 'guru123');
    const platformOwnerPassword = env.SEED_PLATFORM_OWNER_PASSWORD;
    const accounts = [
      ['admin', 'Admin IMBS', 'admin', adminPassword, null],
      ['guru', 'Guru Bahasa Arab', 'teacher', teacherPassword, null],
    ];

    if (isSecurePlatformOwnerPassword(platformOwnerPassword)) {
      accounts.push(['platform_owner', 'Pemilik Platform', 'platform_owner', platformOwnerPassword, null]);
    }

    return accounts;
  }

  export function isSecurePlatformOwnerPassword(value) {
    const password = typeof value === 'string' ? value : '';
    return password.trim().length >= 24 && password !== 'platform-owner-local';
}

  export function isLegacyBootstrapSeedEnabled(env = process.env) {
    return env.LEGACY_BOOTSTRAP_SEED_ENABLED !== 'false';
  }
