export const DEFAULT_EXAM_TIME_ZONE = 'Asia/Jakarta';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function resolveExamTimeZone(value) {
  const candidate = String(value || '').trim() || DEFAULT_EXAM_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_EXAM_TIME_ZONE;
  }
}

function normalizeDate(value) {
  const raw = String(value ?? '').trim().slice(0, 10);
  return DATE_PATTERN.test(raw) ? raw : '';
}

function normalizeTime(value) {
  const raw = String(value ?? '').trim().slice(0, 5);
  return TIME_PATTERN.test(raw) ? raw : '';
}

function zonedParts(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

export function formatSessionDateLabel(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || '').trim().slice(0, 10));
  if (!match) return String(date || '');
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}

/**
 * Evaluates whether an exam may be run right now. An exam is runnable only on its
 * session date, between its session start and end time, in the exam time zone.
 */
export function examSessionWindow(exam, { now = new Date(), timeZone = DEFAULT_EXAM_TIME_ZONE } = {}) {
  const sessionNumber = Number(exam?.sessionNumber);
  const sessionDate = normalizeDate(exam?.sessionDate);
  const sessionStart = normalizeTime(exam?.sessionStart);
  const sessionEnd = normalizeTime(exam?.sessionEnd);
  if (!Number.isInteger(sessionNumber) || sessionNumber < 1 || !sessionDate || !sessionStart || !sessionEnd) {
    return {
      configured: false,
      open: false,
      startsAt: null,
      endsAt: null,
      message: 'Tentukan sesi ujian (hari/tanggal dan jam mulai–berakhir) sebelum menjalankan ujian.',
    };
  }

  const scheduleLabel = `sesi ${sessionNumber} pada ${formatSessionDateLabel(sessionDate)} pukul ${sessionStart}–${sessionEnd}`;
  const { date: localDate, time: localTime } = zonedParts(now, timeZone);
  const open = localDate === sessionDate && localTime >= sessionStart && localTime < sessionEnd;

  let message;
  if (open) message = `Ujian ${scheduleLabel} sedang dalam jadwal.`;
  else if (localDate < sessionDate) message = `Ujian ${scheduleLabel}. Ujian baru dapat dijalankan pada tanggal dan jam tersebut.`;
  else if (localDate > sessionDate) message = `Jadwal ujian ${scheduleLabel} sudah berakhir.`;
  else if (localTime < sessionStart) message = `Ujian ${scheduleLabel}. Ujian baru dapat dijalankan mulai pukul ${sessionStart}.`;
  else message = `Jadwal ujian ${scheduleLabel} sudah berakhir pada pukul ${sessionEnd}.`;

  return {
    configured: true,
    open,
    startsAt: `${sessionDate}T${sessionStart}`,
    endsAt: `${sessionDate}T${sessionEnd}`,
    sessionNumber,
    sessionDate,
    sessionStart,
    sessionEnd,
    message,
  };
}
