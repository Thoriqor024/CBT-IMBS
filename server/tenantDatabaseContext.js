import { AsyncLocalStorage } from 'node:async_hooks';

export function createTenantDatabaseContext({
  router,
  storage = new AsyncLocalStorage(),
  enrichContext = async () => ({}),
}) {
  if (!router || typeof router.resolve !== 'function' || typeof router.resolveById !== 'function') {
    throw new TypeError('A tenant database router is required.');
  }

  return {
    storage,
    run(tenantContext, callback) {
      return storage.run(tenantContext, callback);
    },
    getCurrent() {
      return storage.getStore() || null;
    },
    middleware: async (req, _res, next) => {
      try {
        let resolved;
        if (req.method === 'POST' && req.path === '/api/auth/login') {
          resolved = await router.resolve(req.body?.schoolCode || req.headers?.['x-school-code']);
        } else if (req.session?.user?.tenantId) {
          resolved = await router.resolveById(req.session.user.tenantId);
          const requestedTenantId = String(req.session.user.tenantId).trim();
          const resolvedTenantId = String(resolved.tenant?.id || '').trim();
          if (!requestedTenantId || !resolvedTenantId || requestedTenantId !== resolvedTenantId) {
            const error = new Error('Tenant scope mismatch. Session tenant does not match the authenticated school context.');
            error.status = 403;
            error.code = 'TENANT_SCOPE_MISMATCH';
            throw error;
          }
        } else {
          return next();
        }

        const context = {
          tenant: resolved.tenant,
          pool: resolved.pool,
          ...await enrichContext(resolved),
        };
        return storage.run(context, next);
      } catch (error) {
        return next(error);
      }
    },
  };
}

export function createTenantAwarePool({ fallbackPool, getTenantPool }) {
  if (!fallbackPool || typeof fallbackPool.query !== 'function' || typeof fallbackPool.connect !== 'function') {
    throw new TypeError('A fallback database pool is required.');
  }
  if (typeof getTenantPool !== 'function') throw new TypeError('getTenantPool is required.');

  return new Proxy(fallbackPool, {
    get(target, property) {
      if (property === 'query' || property === 'connect' || property === 'end') {
        return (...args) => {
          const tenantPool = getTenantPool();
          const selectedPool = tenantPool || target;
          return selectedPool[property](...args);
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}