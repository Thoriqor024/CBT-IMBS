import fs from 'node:fs';
import pg from 'pg';

const raw = fs.readFileSync('.env', 'utf8');
const env = {};
for (const line of raw.split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const email = 'thoriqor@gmail.com';
const password = env.SEED_PLATFORM_OWNER_PASSWORD;
const cookieJar = new Map();

async function fetchWithCookies(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (cookieJar.size) {
    headers.Cookie = Array.from(cookieJar.entries()).map(([key, value]) => `${key}=${value}`).join('; ');
  }
  const response = await fetch(url, { ...options, headers, redirect: 'manual' });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/^([^=;]+)=([^;]+)/);
    if (match) cookieJar.set(match[1], match[2]);
  }
  return response;
}

async function main() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  console.log('TENANCY_ENABLED=' + (env.TENANCY_ENABLED === 'true'));
  const loginRes = await fetchWithCookies('https://localhost:8443/api/platform/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginText = await loginRes.text();
  console.log('LOGIN_STATUS=' + loginRes.status);
  console.log('LOGIN_BODY=' + loginText.slice(0, 300));
  if (loginRes.status !== 200) throw new Error('Platform-owner login failed');

  const overviewRes = await fetchWithCookies('https://localhost:8443/api/platform/overview');
  const overviewText = await overviewRes.text();
  console.log('OVERVIEW_STATUS=' + overviewRes.status);
  console.log('OVERVIEW_BODY=' + overviewText.slice(0, 400));

  const tenantsBefore = await fetchWithCookies('https://localhost:8443/api/platform/tenants?limit=5');
  const tenantsBeforeText = await tenantsBefore.text();
  console.log('TENANTS_STATUS=' + tenantsBefore.status);
  console.log('TENANTS_BODY=' + tenantsBeforeText.slice(0, 400));

  const provisionPayload = {
    schoolCode: 'livecheck',
    displayName: 'Live Provision Check',
    adminName: 'Operator Live',
    adminEmail: 'livecheck-admin@example.com',
    trialDays: 14,
    maxStudents: 10,
    maxTeachers: 2,
  };

  const provisionRes = await fetchWithCookies('https://localhost:8443/api/platform/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(provisionPayload),
  });
  const provisionText = await provisionRes.text();
  console.log('PROVISION_STATUS=' + provisionRes.status);
  console.log('PROVISION_BODY=' + provisionText.slice(0, 600));

  if (provisionRes.status !== 201) {
    throw new Error('Live provisioning failed');
  }

  const pool = new pg.Pool({
    host: env.CONTROL_DB_HOST || env.DB_HOST || 'localhost',
    port: Number(env.CONTROL_DB_PORT || env.DB_PORT || 5433),
    database: env.CONTROL_DB_NAME || 'cbt_control_plane',
    user: env.CONTROL_DB_USER || 'cbt_control_app',
    password: env.CONTROL_DB_PASSWORD,
    connectionTimeoutMillis: 5000,
  });

  try {
    const secretRes = await pool.query(`SELECT secret_ref, database_user FROM control_plane.tenant_database_secrets WHERE secret_ref LIKE 'tenant/%' ORDER BY updated_at DESC LIMIT 3`);
    console.log('SECRET_ROWS=' + secretRes.rowCount);

    const tenantRes = await pool.query(`SELECT id, school_code, display_name, status, database_name FROM control_plane.tenants WHERE school_code = 'livecheck' OR display_name = 'Live Provision Check' ORDER BY created_at DESC LIMIT 10`);
    console.log('TENANT_ROWS=' + tenantRes.rowCount);
    for (const row of tenantRes.rows) {
      console.log('TENANT_ENTRY=' + JSON.stringify({ id: row.id, schoolCode: row.school_code, displayName: row.display_name, status: row.status, databaseName: row.database_name }));
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('VERIFY_ERR=' + err.message);
  process.exit(1);
});
