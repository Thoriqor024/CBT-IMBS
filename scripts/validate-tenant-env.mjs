import { validateTenantRuntimeEnvironment } from '../server/tenantRuntime.js';

const env = process.env;
const result = validateTenantRuntimeEnvironment(env);

if (!result.enabled) {
  console.log('Tenant mode is disabled. Deployment remains in safe legacy mode.');
  process.exit(0);
}

if (!result.valid) {
  console.error('Tenant mode validation failed.');
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Tenant mode validation succeeded.');
