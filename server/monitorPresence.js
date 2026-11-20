export const ONLINE_THRESHOLD_MS = 35_000;
export const OFFLINE_THRESHOLD_MS = 90_000;

export function isOnline(lastPingAt, now = Date.now()) {
  if (!lastPingAt) return false;
  const ping = Date.parse(lastPingAt);
  return Number.isFinite(ping) && now - ping < ONLINE_THRESHOLD_MS;
}

export function isOffline(lastPingAt, now = Date.now()) {
  if (!lastPingAt) return true;
  const ping = Date.parse(lastPingAt);
  return !Number.isFinite(ping) || now - ping >= OFFLINE_THRESHOLD_MS;
}
