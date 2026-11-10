import { guessCountry, COUNTRIES, mobileProblem } from './countries.js';

export const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const prettyDate = v => new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

// Normalises anything we may hold (string | {email,name,mobile}) into a contact object.
export const toContact = v => (typeof v === 'string' ? { email: v.trim().toLowerCase(), name: '', mobile: '' }
  : { email: String(v?.email || '').trim().toLowerCase(), name: String(v?.name || '').trim(), mobile: String(v?.mobile || '').trim() });

// Merge by email; later non-empty name/mobile fill gaps. Returns { list, added, duplicates }.
export function mergeContacts(existing, incoming) {
  const map = new Map(existing.map(c => [c.email, c]));
  let added = 0, duplicates = 0;
  incoming.map(toContact).filter(c => c.email).forEach(c => {
    const prev = map.get(c.email);
    if (prev) { duplicates++; map.set(c.email, { ...prev, name: prev.name || c.name, mobile: prev.mobile || c.mobile }); }
    else { map.set(c.email, c); added++; }
  });
  return { list: [...map.values()], added, duplicates };
}

/* Free-text entry: "asha@x.com +91 98765 43210, ravi@y.com" -> contacts.
   For each email, a phone number found before the next email is attached to it. */
export function parseEntry(text) {
  const hits = [...text.matchAll(/[^\s,;<>()"]+@[^\s,;<>()"]+/g)];
  return hits.map((m, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].index : text.length;
    const phone = text.slice(m.index + m[0].length, end).match(/\+?\d[\d\s\-().]{5,}\d/);
    return { email: m[0].toLowerCase(), name: '', mobile: phone ? normalizeLooseMobile(phone[0]) : '' };
  });
}

// Spreadsheet numbers often come without "+": 10 digits -> assume the browser's country (India by default).
export function normalizeLooseMobile(raw, iso = guessCountry()) {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d+\.0+$/.test(s)) s = s.split('.')[0]; // Excel can hand numbers over as "9876543210.0"
  s = s.replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('+')) return s;
  const dial = (COUNTRIES.find(c => c.iso === iso) || COUNTRIES[0]).dial;
  if (s.startsWith(dial) && s.length > 10) return '+' + s;   // "919876543210"
  return '+' + dial + s.replace(/^0+/, '');
}

const HEADERS = {
  email: /^(e[-_ ]?mail|email address|mail)$/i,
  name: /^(name|full ?name|first ?name|contact|customer|student)$/i,
  mobile: /^(mobile|phone|cell|contact ?(no|number)|mobile ?(no|number)|phone ?(no|number)|whatsapp|tel|number)$/i,
};

/* Reads .xlsx / .xls / .csv in the browser. Finds email / name / mobile columns by header name
   (falls back to the column that contains "@"). Returns { contacts, skipped, sheet }. */
export async function readSheet(file) {
  const XLSX = await import('xlsx'); // loaded on demand to keep the first page load small
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellText: true, raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error('That file has no sheets.');
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }).filter(r => r.some(c => String(c).trim()));
  if (!rows.length) throw new Error('That file looks empty.');

  const head = rows[0].map(c => String(c).trim());
  const find = re => head.findIndex(h => re.test(h));
  let eCol = find(HEADERS.email), nCol = find(HEADERS.name), mCol = find(HEADERS.mobile);
  let start = 1;
  if (eCol < 0) { // no recognisable header: look for the column full of emails
    eCol = head.map((_, i) => rows.slice(0, 50).filter(r => String(r[i]).includes('@')).length).reduce((best, n, i, a) => (n > a[best] ? i : best), 0);
    if (!rows.slice(0, 50).some(r => String(r[eCol]).includes('@'))) throw new Error('No email column found. Add a column headed "email".');
    start = String(head[eCol]).includes('@') ? 0 : 1;
  }
  const contacts = [];
  let skipped = 0;
  rows.slice(start).forEach(r => {
    const email = String(r[eCol] ?? '').trim().toLowerCase();
    if (!validEmail(email)) { skipped++; return; }
    contacts.push({ email, name: nCol >= 0 ? String(r[nCol] ?? '').trim() : '', mobile: mCol >= 0 ? normalizeLooseMobile(r[mCol]) : '' });
  });
  const badMobiles = contacts.filter(c => c.mobile && mobileProblem(c.mobile)).length;
  contacts.forEach(c => { if (c.mobile && mobileProblem(c.mobile)) c.mobile = ''; }); // drop unusable numbers, keep the email
  return { contacts, skipped, badMobiles, hasMobile: mCol >= 0 };
}

export async function downloadTemplate() {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet([
    ['name', 'email', 'mobile'],
    ['Asha Rao', 'asha@example.com', '+919876543210'],
    ['Ravi Kumar', 'ravi@example.com', '9123456780'],
  ]);
  ws['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
  XLSX.writeFile(wb, 'pulsepost-contacts-template.xlsx');
}

export const personalize = (tpl, c) => String(tpl).replace(/{{\s*(name|email|mobile)\s*}}/gi, (_, k) => {
  k = k.toLowerCase();
  return k === 'name' ? (c.name || c.email.split('@')[0]) : k === 'email' ? c.email : c.mobile || '';
});
