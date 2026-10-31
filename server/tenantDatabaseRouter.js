const TENANT_CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const DATABASE_NAME_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

function tenantError(message, status, code) {
  return Object.assign(new Error(message), { status, code });
}

function normalizeTenantCode(value) {
  const code = String(value ?? '').trim().toLowerCase();
  if (!TENANT_CODE_PATTERN.test(code)) {
    throw tenantError('Kode sekolah tidak valid.', 400, 'INVALID_TENANT_CODE');
  }
  return code;
}

function validateTenantRecord(tenant) {
  if (!tenant || !DATABASE_NAME_PATTERN.test(String(tenant.databaseName || ''))
    || typeof tenant.databaseSecretRef !== 'string' || !tenant.databaseSecretRef.trim()) {
    throw tenantError('Konfigurasi tenant tidak valid.', 503, 'TENANT_CONFIGURATION_INVALID');
  }
}

function ensureTenantEntitled(tenant, now) {
  const expiryValue = tenant.status === 'trial' ? tenant.trialEndsAt
    : tenant.status === 'active' ? tenant.serviceEndsAt
      : null;
  const expiry = expiryValue ? new Date(expiryValue) : null;
  if (!expiry || Number.isNaN(expiry.getTime())) {
    throw tenantError('Masa layanan sekolah belum dikonfigurasi.', 403, 'TENANT_SERVICE_UNCONFIGURED');
  }
  if (expiry <= now) {
    throw tenantError('Masa layanan sekolah telah berakhir.', 403, 'TENANT_SERVICE_EXPIRED');
  }
}

export class TenantDatabaseRouter {
  #registry;
  #resolveSecret;
  #createPool;
  #poolConfig;
  #maxPools;
  #now;
  #pools = new Map();
  #pendingPools = new Map();

  constructor({
    registry,
    resolveSecret,
    createPool,
    poolConfig,
    maxPools = 10,
    maxConnectionsPerPool = 5,
    maxTotalTenantConnections = 50,
    now = () => new Date(),
  }) {
    if (!registry || typeof registry.findByCode !== 'function') throw new TypeError('registry.findByCode is required.');
    if (typeof resolveSecret !== 'function') throw new TypeError('resolveSecret is required.');
    if (typeof createPool !== 'function') throw new TypeError('createPool is required.');
    if (!Number.isSafeInteger(maxPools) || maxPools < 1) throw new TypeError('maxPools must be a positive integer.');
    if (!Number.isSafeInteger(maxConnectionsPerPool) || maxConnectionsPerPool < 1
      || !Number.isSafeInteger(maxTotalTenantConnections) || maxTotalTenantConnections < maxPools
      || typeof now !== 'function') throw new TypeError('Tenant pool connection limits or clock are invalid.');
    this.#registry = registry;
    this.#resolveSecret = resolveSecret;
    this.#createPool = createPool;
    this.#poolConfig = {
      ...poolConfig,
      max: Math.min(
        poolConfig?.max ?? maxConnectionsPerPool,
        maxConnectionsPerPool,
        Math.floor(maxTotalTenantConnections / maxPools),
      ),
    };
    this.#maxPools = maxPools;
    this.#now = now;
  }

  async resolve(codeValue) {
    const code = normalizeTenantCode(codeValue);
    const tenant = await this.#registry.findByCode(code);
    if (!tenant) throw tenantError('Sekolah tidak ditemukan.', 404, 'TENANT_NOT_FOUND');
    return this.#resolveTenant(tenant);
  }

  async resolveById(tenantId) {
    if (typeof tenantId !== 'string' || !tenantId.trim()) {
      throw tenantError('Identitas tenant tidak valid.', 400, 'INVALID_TENANT_ID');
    }
    const tenant = await this.#registry.findById(tenantId);
    if (!tenant) throw tenantError('Sekolah tidak ditemukan.', 404, 'TENANT_NOT_FOUND');
    return this.#resolveTenant(tenant);
  }

  async #resolveTenant(tenant) {
    if (!['trial', 'active'].includes(tenant.status)) {
      throw tenantError('Layanan sekolah sedang tidak aktif.', 403, 'TENANT_INACTIVE');
    }
    ensureTenantEntitled(tenant, this.#now());
    validateTenantRecord(tenant);

    const existingPool = this.#pools.get(tenant.id);
    if (existingPool) return { tenant, pool: existingPool };

    const pendingPool = this.#pendingPools.get(tenant.id);
    if (pendingPool) return { tenant, pool: await pendingPool };
    if (this.#pools.size + this.#pendingPools.size >= this.#maxPools) {
      throw tenantError('Kapasitas koneksi tenant sedang penuh.', 503, 'TENANT_POOL_CAPACITY');
    }

    const poolPromise = this.#createTenantPool(tenant);
    this.#pendingPools.set(tenant.id, poolPromise);
    try {
      const pool = await poolPromise;
      this.#pools.set(tenant.id, pool);
      return { tenant, pool };
    } finally {
      this.#pendingPools.delete(tenant.id);
    }
  }

  async #createTenantPool(tenant) {
    const credentials = await this.#resolveSecret(tenant.databaseSecretRef);
    if (!credentials || typeof credentials.user !== 'string' || !credentials.user
      || typeof credentials.password !== 'string' || !credentials.password) {
      throw tenantError('Kredensial database tenant tidak tersedia.', 503, 'TENANT_CREDENTIALS_UNAVAILABLE');
    }
    return this.#createPool({
      ...this.#poolConfig,
      database: tenant.databaseName,
      user: credentials.user,
      password: credentials.password,
    });
  }

  async close() {
    const pools = [...this.#pools.values()];
    this.#pools.clear();
    await Promise.all(pools.map(pool => pool.end()));
  }
}

export { normalizeTenantCode };