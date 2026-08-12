export function sanitizeString(input, maxLength = 200) {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  const stripped = trimmed.replace(/[<>]/g, '');
  return stripped.slice(0, maxLength);
}

export function sanitizeNumber(input) {
  const n = Number(input);
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) > 1e12) return null;
  return n;
}

export function isValidUUID(s) {
  if (typeof s !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export function isValidEmail(s) {
  if (typeof s !== 'string') return false;
  // very small email sanity check
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

export function isValidSubscriptionStatus(s) {
  if (typeof s !== 'string') return false;
  const ok = ['active', 'inactive', 'cancelled', 'trial', 'free'];
  return ok.includes(s.toLowerCase());
}

export function isValidBillingFrequency(s) {
  if (typeof s !== 'string') return false;
  const ok = ['monthly', 'yearly', 'weekly', 'quarterly'];
  return ok.includes(s.toLowerCase());
}
