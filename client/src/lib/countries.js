// Country dial codes for the mobile-number picker. Flags are built from the ISO code (no image files needed).
export const COUNTRIES = [
  ['IN', 'India', '91'], ['US', 'United States', '1'], ['GB', 'United Kingdom', '44'], ['CA', 'Canada', '1'],
  ['AU', 'Australia', '61'], ['AE', 'United Arab Emirates', '971'], ['SA', 'Saudi Arabia', '966'], ['SG', 'Singapore', '65'],
  ['MY', 'Malaysia', '60'], ['LK', 'Sri Lanka', '94'], ['NP', 'Nepal', '977'], ['BD', 'Bangladesh', '880'],
  ['PK', 'Pakistan', '92'], ['QA', 'Qatar', '974'], ['KW', 'Kuwait', '965'], ['OM', 'Oman', '968'],
  ['BH', 'Bahrain', '973'], ['DE', 'Germany', '49'], ['FR', 'France', '33'], ['ES', 'Spain', '34'],
  ['IT', 'Italy', '39'], ['NL', 'Netherlands', '31'], ['IE', 'Ireland', '353'], ['SE', 'Sweden', '46'],
  ['CH', 'Switzerland', '41'], ['NZ', 'New Zealand', '64'], ['ZA', 'South Africa', '27'], ['NG', 'Nigeria', '234'],
  ['KE', 'Kenya', '254'], ['EG', 'Egypt', '20'], ['BR', 'Brazil', '55'], ['MX', 'Mexico', '52'],
  ['AR', 'Argentina', '54'], ['JP', 'Japan', '81'], ['KR', 'South Korea', '82'], ['CN', 'China', '86'],
  ['HK', 'Hong Kong', '852'], ['ID', 'Indonesia', '62'], ['PH', 'Philippines', '63'], ['TH', 'Thailand', '66'],
  ['VN', 'Vietnam', '84'], ['TR', 'Türkiye', '90'], ['RU', 'Russia', '7'], ['PL', 'Poland', '48'],
].map(([iso, name, dial]) => ({ iso, name, dial, flag: [...iso].map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('') }));

// Time zone is a better hint than browser language (many people in India run an "en-US" browser).
const TZ_COUNTRY = {
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Europe/London': 'GB', 'Asia/Dubai': 'AE', 'Asia/Singapore': 'SG', 'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW', 'Asia/Muscat': 'OM', 'Asia/Bahrain': 'BH', 'Asia/Dhaka': 'BD', 'Asia/Karachi': 'PK',
  'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP', 'Asia/Katmandu': 'NP', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH',
  'Asia/Bangkok': 'TH', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK',
  'Europe/Berlin': 'DE', 'Europe/Paris': 'FR', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Dublin': 'IE',
  'Europe/Stockholm': 'SE', 'Europe/Zurich': 'CH', 'Europe/Warsaw': 'PL', 'Europe/Istanbul': 'TR', 'Europe/Moscow': 'RU',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU', 'Pacific/Auckland': 'NZ',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Toronto': 'CA',
  'America/Vancouver': 'CA', 'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR', 'America/Argentina/Buenos_Aires': 'AR',
  'Africa/Johannesburg': 'ZA', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE', 'Africa/Cairo': 'EG',
};
export function guessCountry() {
  try {
    const tz = TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone];
    if (tz) return tz;
    const region = new Intl.Locale(navigator.language).maximize().region;
    if (COUNTRIES.some(c => c.iso === region)) return region;
  } catch { /* older browsers */ }
  return 'IN';
}

// "+919876543210" -> { iso: 'IN', national: '9876543210' }  (longest matching dial code wins)
export function splitMobile(e164, fallbackIso = guessCountry()) {
  const digits = String(e164 || '').replace(/\D/g, '');
  if (!digits) return { iso: fallbackIso, national: '' };
  const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find(c => digits.startsWith(c.dial));
  return match ? { iso: match.iso, national: digits.slice(match.dial.length) } : { iso: fallbackIso, national: digits };
}

export function buildMobile(iso, national) {
  const c = COUNTRIES.find(x => x.iso === iso) || COUNTRIES[0];
  const digits = String(national || '').replace(/\D/g, '').replace(/^0+/, '');
  return digits ? `+${c.dial}${digits}` : '';
}

// Returns '' when OK (or empty), otherwise a short message.
export function mobileProblem(e164) {
  if (!e164) return '';
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return 'Enter 8–15 digits including the country code.';
  if (e164.startsWith('+91') && !/^\+91[6-9]\d{9}$/.test(e164)) return 'Indian mobile numbers have 10 digits and start with 6, 7, 8 or 9.';
  return '';
}

export function prettyMobile(e164) {
  if (!e164) return '';
  const { iso, national } = splitMobile(e164);
  const c = COUNTRIES.find(x => x.iso === iso);
  if (!c) return e164;
  const grouped = national.length === 10 ? `${national.slice(0, 5)} ${national.slice(5)}` : national.replace(/(\d{3})(?=\d)/g, '$1 ');
  return `+${c.dial} ${grouped}`;
}
