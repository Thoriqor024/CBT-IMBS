import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';

const HTTP_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const OVERLOAD_MESSAGE = 'Database is temporarily busy. Retry shortly.';
const POOL_SAMPLE_INTERVAL_MS = 5000;

export function getMethodLabel(method) {
  const normalized = typeof method === 'string' ? method.toUpperCase() : '';
  return HTTP_METHODS.has(normalized) ? normalized : 'OTHER';
}

export function getRouteLabel(request) {
  const routePath = request.route?.path;
  if (typeof routePath !== 'string' || routePath.length === 0) return 'unmatched';
  const baseUrl = typeof request.baseUrl === 'string' ? request.baseUrl : '';
  return `${baseUrl}${routePath}` || 'unmatched';
}

export function getStatusLabel(status) {
  return Number.isInteger(status) && status >= 100 && status <= 599 ? String(status) : 'OTHER';
}

export function isDatabaseTimeout(error) {
  return error?.message === 'timeout exceeded when trying to connect'
    || error?.message === 'Query read timeout';
}

export function createErrorHandler(logger = console) {
  return (error, _request, response, _next) => {
    if (isDatabaseTimeout(error)) {
      response.set('Retry-After', '1');
      return response.status(503).json({
        error: OVERLOAD_MESSAGE,
        code: 'DB_OVERLOAD',
        message: OVERLOAD_MESSAGE,
      });
    }

    logger.error(error);
    return response.status(error.status || 500).json({
      error: error.status ? error.message : 'Terjadi kesalahan pada server.',
      ...(error.code ? { code: error.code } : {}),
    });
  };
}

export function createPoolSampler({
  pool,
  logger = console,
  intervalMs = POOL_SAMPLE_INTERVAL_MS,
  now = () => new Date(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}) {
  let timer = null;

  const sample = () => {
    const waitingCountAvailable = Number.isFinite(pool?.waitingCount);
    logger.log(JSON.stringify({
      type: 'db_pool_sample',
      timestamp: now().toISOString(),
      totalCount: Number.isFinite(pool?.totalCount) ? pool.totalCount : null,
      idleCount: Number.isFinite(pool?.idleCount) ? pool.idleCount : null,
      waitingCount: waitingCountAvailable ? pool.waitingCount : null,
      waitingCountAvailable,
    }));
  };

  return {
    start() {
      if (timer !== null) return;
      timer = setIntervalFn(sample, intervalMs);
      timer?.unref?.();
    },
    stop() {
      if (timer === null) return;
      clearIntervalFn(timer);
      timer = null;
    },
  };
}

export function createObservability({ pool, logger = console } = {}) {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  const labelNames = ['method', 'route', 'status'];
  const requestCounter = new Counter({
    name: 'http_requests_total',
    help: 'Total number of completed HTTP requests.',
    labelNames,
    registers: [registry],
  });
  const requestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds.',
    labelNames,
    registers: [registry],
  });

  new Gauge({
    name: 'db_pool_total_count',
    help: 'Current number of PostgreSQL clients in the pool.',
    registers: [registry],
    collect() {
      if (Number.isFinite(pool?.totalCount)) this.set(pool.totalCount);
    },
  });
  new Gauge({
    name: 'db_pool_idle_count',
    help: 'Current number of idle PostgreSQL clients in the pool.',
    registers: [registry],
    collect() {
      if (Number.isFinite(pool?.idleCount)) this.set(pool.idleCount);
    },
  });

  const httpMetricsMiddleware = (request, response, next) => {
    if (request.path === '/metrics') return next();

    const startedAt = process.hrtime.bigint();
    response.once('finish', () => {
      const labels = {
        method: getMethodLabel(request.method),
        route: getRouteLabel(request),
        status: getStatusLabel(response.statusCode),
      };
      requestCounter.inc(labels);
      requestDuration.observe(labels, Number(process.hrtime.bigint() - startedAt) / 1e9);
    });
    next();
  };

  const metricsHandler = async (_request, response, next) => {
    try {
      response.set('Content-Type', registry.contentType);
      response.end(await registry.metrics());
    } catch (error) {
      next(error);
    }
  };

  return {
    registry,
    httpMetricsMiddleware,
    metricsHandler,
    createPoolSampler: options => createPoolSampler({ pool, logger, ...options }),
  };
}