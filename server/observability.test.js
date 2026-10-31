import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import test from 'node:test';
import express from 'express';
import { getPoolConfig } from './db.js';
import {
  createErrorHandler,
  createObservability,
  getMethodLabel,
  getRouteLabel,
  getStatusLabel,
} from './observability.js';

async function withServer(app, run) {
  const server = app.listen(0);
  await once(server, 'listening');
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

function createApp(pool = { totalCount: 2, idleCount: 1, waitingCount: 0 }) {
  const observability = createObservability({ pool, logger: { log() {} } });
  const app = express();
  app.use(observability.httpMetricsMiddleware);
  app.get('/metrics', observability.metricsHandler);
  app.all('/api/items/:id', (_req, res) => res.json({ ok: true }));
  app.get('/api/connection-timeout', (_req, _res, next) => next(new Error('timeout exceeded when trying to connect')));
  app.get('/api/failure/:id', (_req, _res, next) => next(new Error('Query read timeout')));
  app.get('/api/database-error', (_req, _res, next) => next(new Error('private driver detail')));
  app.use(createErrorHandler({ error() {} }));
  return { app, observability };
}

test('pool acquisition and configured query timeouts return sanitized overload responses', async () => {
  const { app } = createApp();
  for (const path of ['/api/connection-timeout', '/api/failure/123']) {
    await withServer(app, async baseUrl => {
      const response = await fetch(`${baseUrl}${path}`);
      const body = await response.json();
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('retry-after'), '1');
      assert.deepEqual(body, {
        error: 'Database is temporarily busy. Retry shortly.',
        code: 'DB_OVERLOAD',
        message: 'Database is temporarily busy. Retry shortly.',
      });
      assert.equal(JSON.stringify(body).includes('timeout'), false);
    });
  }
});

test('unrelated database errors keep the generic response and do not leak driver details', async () => {
  const { app } = createApp();
  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/database-error`);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Terjadi kesalahan pada server.' });
  });
});

test('metrics endpoint emits Prometheus process and HTTP metrics, excluding its own scrape', async () => {
  const { app } = createApp();
  await withServer(app, async baseUrl => {
    await fetch(`${baseUrl}/api/items/123`);
    const response = await fetch(`${baseUrl}/metrics`);
    const metrics = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/plain/);
    assert.match(metrics, /process_cpu_user_seconds_total/);
    assert.match(metrics, /process_resident_memory_bytes/);
    assert.match(metrics, /nodejs_heap_size_used_bytes/);
    assert.match(metrics, /db_pool_total_count 2/);
    assert.match(metrics, /db_pool_idle_count 1/);
    assert.match(metrics, /http_requests_total\{method="GET",route="\/api\/items\/:id",status="200"\} 1/);
    assert.match(metrics, /http_request_duration_seconds_count\{method="GET",route="\/api\/items\/:id",status="200"\} 1/);
    assert.doesNotMatch(metrics, /route="\/metrics"/);
  });
});

test('method, route, and status labels use bounded normalized values', () => {
  assert.equal(getMethodLabel('GET'), 'GET');
  assert.equal(getMethodLabel('CUSTOM-METHOD'), 'OTHER');
  assert.equal(getRouteLabel({ baseUrl: '/api', route: { path: '/items/:id' } }), '/api/items/:id');
  assert.equal(getRouteLabel({ baseUrl: '', route: undefined }), 'unmatched');
  assert.equal(getStatusLabel(503), '503');
  assert.equal(getStatusLabel(Number.NaN), 'OTHER');
});

test('database pool and timeout settings default safely and reject out-of-range overrides', () => {
  const defaults = getPoolConfig({});
  assert.equal(defaults.max, 70);
  assert.equal(defaults.connectionTimeoutMillis, 5000);
  assert.equal(defaults.query_timeout, 5000);

  const configured = getPoolConfig({
    DB_POOL_MAX: '12',
    DB_CONNECTION_TIMEOUT_MS: '2500',
    DB_QUERY_TIMEOUT_MS: '9000',
  });
  assert.equal(configured.max, 12);
  assert.equal(configured.connectionTimeoutMillis, 2500);
  assert.equal(configured.query_timeout, 9000);

  const invalid = getPoolConfig({ DB_POOL_MAX: '201', DB_CONNECTION_TIMEOUT_MS: '0', DB_QUERY_TIMEOUT_MS: 'not-a-number' });
  assert.equal(invalid.max, 70);
  assert.equal(invalid.connectionTimeoutMillis, 5000);
  assert.equal(invalid.query_timeout, 5000);
});

test('varying route IDs and unrecognized methods do not create raw metric labels', async () => {
  const { app } = createApp();
  await withServer(app, async baseUrl => {
    await Promise.all([123, 456, 789].map(id => fetch(`${baseUrl}/api/items/${id}`)));
    await new Promise((resolve, reject) => {
      const request = httpRequest(`${baseUrl}/api/items/other`, { method: 'PURGE' }, response => {
        response.resume();
        response.on('end', resolve);
      });
      request.on('error', reject);
      request.end();
    });
    const metrics = await (await fetch(`${baseUrl}/metrics`)).text();
    assert.match(metrics, /route="\/api\/items\/:id"/);
    assert.doesNotMatch(metrics, /route="[^\"]*(123|456|789)/);
    assert.equal((metrics.match(/http_requests_total\{method="GET",route="\/api\/items\/:id",status="200"\}/g) || []).length, 1);
    assert.match(metrics, /http_requests_total\{method="OTHER",route="\/api\/items\/:id",status="200"\} 1/);
  });
});

test('pool sampler is idempotent, unrefs and clears its interval, and marks unavailable waiting count', () => {
  const { observability } = createApp({ totalCount: 2, idleCount: 1 });
  let intervalCallback;
  let intervalDelay;
  let unrefCalls = 0;
  let clearCalls = 0;
  const samples = [];
  const sampler = observability.createPoolSampler({
    pool: { totalCount: 2, idleCount: 1 },
    logger: { log: message => samples.push(JSON.parse(message)) },
    now: () => new Date('2026-10-06T00:00:00.000Z'),
    setIntervalFn: (callback, delay) => {
      intervalCallback = callback;
      intervalDelay = delay;
      return { unref: () => { unrefCalls += 1; } };
    },
    clearIntervalFn: () => { clearCalls += 1; },
  });

  sampler.start();
  sampler.start();
  intervalCallback();
  assert.equal(intervalDelay, 5000);
  assert.equal(unrefCalls, 1);
  assert.deepEqual(samples[0], {
    type: 'db_pool_sample',
    timestamp: '2026-10-06T00:00:00.000Z',
    totalCount: 2,
    idleCount: 1,
    waitingCount: null,
    waitingCountAvailable: false,
  });
  sampler.stop();
  sampler.stop();
  assert.equal(clearCalls, 1);
});

test('pool sampler records the public waitingCount value when it is available', () => {
  const samples = [];
  const sampler = createObservability({ pool: { totalCount: 4, idleCount: 2, waitingCount: 3 } })
    .createPoolSampler({
      logger: { log: message => samples.push(JSON.parse(message)) },
      setIntervalFn: callback => { callback(); return { unref() {} }; },
    });

  sampler.start();
  assert.equal(samples[0].waitingCount, 3);
  assert.equal(samples[0].waitingCountAvailable, true);
  sampler.stop();
});

test('public frontend route rejects /metrics instead of serving Prometheus data', async () => {
  const { readFile } = await import('node:fs/promises');
  const nginxConfig = await readFile(new URL('../nginx.conf', import.meta.url), 'utf8');
  const composeConfig = await readFile(new URL('../docker-compose.yml', import.meta.url), 'utf8');
  const operationsGuide = await readFile(new URL('../pengembangan.md', import.meta.url), 'utf8');
  assert.match(nginxConfig, /location\s*=\s*\/metrics\s*\{\s*return\s+404\s*;/);
  assert.doesNotMatch(nginxConfig, /location\s*=\s*\/metrics[^}]*proxy_pass\s+http:\/\/api:3000/m);
  const apiService = composeConfig.split(/^  api:\s*$/m)[1].split(/^  [\w-]+:\s*$/m)[0];
  assert.doesNotMatch(apiService, /^\s+ports:/m);
  assert.match(operationsGuide, /targets:\s*\["api:3000"\]/);
});
