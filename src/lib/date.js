// src/lib/date.js
export function toDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return value;
  // Accept milliseconds numbers or numeric strings
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isNaN(n) && isFinite(n) && String(value).trim() !== '') {
    const d = new Date(n);
    if (!Number.isNaN(+d)) return d;
  }
  const d = new Date(String(value));
  return Number.isNaN(+d) ? null : d;
}

export function formatDate(value, opts = {}) {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit', ...opts });
}

export function formatDateTime(value, opts = {}) {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleString('he-IL', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    ...opts,
  });
}

export function relativeTimeFromNow(value) {
  const d = toDate(value);
  if (!d) return '';
  const diff = Date.now() - +d;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('he-IL', { numeric: 'auto' });
  const m = 60 * 1000, h = 60 * m, day = 24 * h;
  if (abs < m) return rtf.format(Math.round(diff / 1000), 'second');
  if (abs < h) return rtf.format(Math.round(diff / m), 'minute');
  if (abs < day) return rtf.format(Math.round(diff / h), 'hour');
  return rtf.format(Math.round(diff / day), 'day');
}

