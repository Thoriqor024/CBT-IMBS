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
    ...options,
    headers,
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`Permintaan gagal (${response.status})`);
  return data;
}

export async function apiDownload(path, filename) {
  const schoolCode = getInitialSchoolCode();
  const response = await fetch(`${apiBase}/api${path}`, {
    credentials:'same-origin',
    headers: schoolCode ? {'X-School-Code': schoolCode} : {},
  });
  if(!response.ok){
    const data=await response.json().catch(()=>({}));
    throw new Error(data.error||`Unduhan gagal (${response.status})`);
  }
  const href=URL.createObjectURL(await response.blob());
  const link=document.createElement('a');
  link.href=href;
  link.download=filename;
  link.click();
  URL.revokeObjectURL(href);
}
