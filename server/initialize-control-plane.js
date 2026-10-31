import { createControlPlaneRuntimeFromEnvironment } from './controlPlaneRuntime.js';

let runtime;
try {
  runtime = await createControlPlaneRuntimeFromEnvironment();
  if (!runtime) throw new Error('Control-plane is not configured.');
  await runtime.initializeControlPlane();
  await runtime.verifyControlPlane();
  console.log('Control-plane schema initialized and verified. No secret values were displayed.');
} catch (error) {
  console.error(`Control-plane initialization failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await runtime?.close();
}