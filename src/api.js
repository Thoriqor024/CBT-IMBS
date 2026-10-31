import { getInitialSchoolCode } from './tenantDiscovery.js';

const apiBase=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/+$/,'');

export async function api(path, options={}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const schoolCode = getInitialSchoolCode();
  const headers = {
    ...(isFormData || options.body === undefined ? {} : {'Content-Type':'application/json'}),
    ...(schoolCode ? {'X-School-Code': schoolCode} : {}),
    ...(options.headers||{}),
  };
  const response = await fetch(`${apiBase}/api${path}`, {
    credentials:'same-origin',
    headers,
    ...options,
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`Permintaan gagal (${response.status})`);
  return data;
}
