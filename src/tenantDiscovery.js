export function detectSchoolCodeFromHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return '';
  const host = hostname.trim().toLowerCase().split(':')[0];
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return '';
  const parts = host.split('.');
  if (parts.length > 2 && !['www', 'cbt', 'api', 'app'].includes(parts[0])) {
    return parts[0];
  }
  if (parts.length === 2 && parts[1] === 'localhost' && !['www', 'cbt'].includes(parts[0])) {
    return parts[0];
  }
  return '';
}

export function getInitialSchoolCode(storage = (typeof localStorage !== 'undefined' ? localStorage : null), host = (typeof window !== 'undefined' ? window.location?.hostname : '')) {
  return detectSchoolCodeFromHost(host) || storage?.getItem?.('cbt_last_school_code') || '';
}

export function saveLastSchoolCode(code, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (code && typeof code === 'string' && storage?.setItem) {
    try {
      storage.setItem('cbt_last_school_code', code.trim().toLowerCase());
    } catch {}
  }
}

