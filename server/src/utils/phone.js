// Mobile numbers are stored in international E.164 form: "+" then country code then number (8-15 digits total).
export function normalizeMobile(value) {
  let s = String(value ?? '').trim();
  if (!s) return '';
  s = s.replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  return s;
}

export const isValidMobile = value => /^\+[1-9]\d{7,14}$/.test(value);

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Accepts a plain string ("a@b.com") or an object ({ email, name, mobile }) and returns a clean contact.
export function cleanContact(input) {
  const src = typeof input === 'string' ? { email: input } : input || {};
  return {
    email: String(src.email ?? '').trim().toLowerCase(),
    name: String(src.name ?? '').trim().slice(0, 100),
    mobile: normalizeMobile(src.mobile),
  };
}

// Replaces {{name}}, {{email}}, {{mobile}} (case-insensitive) in a template.
export function personalize(template, contact) {
  const fallbackName = contact.name || contact.email.split('@')[0];
  return String(template).replace(/{{\s*(name|email|mobile)\s*}}/gi, (_, key) => {
    const k = key.toLowerCase();
    return k === 'name' ? fallbackName : k === 'email' ? contact.email : contact.mobile || '';
  });
}
