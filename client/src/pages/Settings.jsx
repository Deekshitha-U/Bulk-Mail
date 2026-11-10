import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Lock, Plug, Smartphone, User, Wifi, WifiOff } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { mobileProblem, prettyMobile } from '../lib/countries.js';
import { PageHeading, PhoneInput, Switch } from '../components/ui.jsx';

function Section({ icon: Icon, title, text, children, delay = 0 }) {
  return <motion.section className="panel settings-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: .4 }}>
    <div className="settings-head"><span className="stat-icon violet"><Icon size={17} /></span><div><h3>{title}</h3><p>{text}</p></div></div>{children}</motion.section>;
}

export default function Settings({ admin, onAdmin, toast }) {
  const [first, setFirst] = useState(admin.firstName || admin.name || '');
  const [last, setLast] = useState(admin.lastName || '');
  const [mobile, setMobile] = useState(admin.mobile || '');
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [health, setHealth] = useState(null);
  const dirty = first.trim() !== (admin.firstName || admin.name || '') || last.trim() !== (admin.lastName || '') || mobile !== (admin.mobile || '');
  async function savePref(k, v) {
    try { const { data } = await api.put('/auth/profile', { prefs: { [k]: v } }); onAdmin(data.admin); } catch (err) { toast(errMsg(err), 'error'); }
  }

  async function saveProfile(e) {
    e.preventDefault();
    const bad = mobileProblem(mobile);
    if (bad) return toast(bad, 'error');
    setSaving(true);
    try { const { data } = await api.put('/auth/profile', { firstName: first, lastName: last, mobile }); onAdmin(data.admin); toast('Profile saved.', 'success'); }
    catch (err) { toast(errMsg(err), 'error'); } finally { setSaving(false); }
  }
  async function changePassword(e) {
    e.preventDefault();
    if (pw.next !== pw.again) return toast('The new passwords do not match.', 'error');
    setPwBusy(true);
    try { await api.put('/auth/password', { current: pw.current, next: pw.next }); setPw({ current: '', next: '', again: '' }); toast('Password updated.', 'success'); }
    catch (err) { toast(errMsg(err), 'error'); } finally { setPwBusy(false); }
  }
  async function check() {
    setHealth({ state: 'checking' });
    const t = performance.now();
    try { await api.get('/health'); setHealth({ state: 'ok', ms: Math.round(performance.now() - t) }); }
    catch (err) { setHealth({ state: 'bad', msg: errMsg(err) }); }
  }

  return <>
    <PageHeading kicker="ACCOUNT / SETTINGS" title="Settings" description="Your profile, security and connection status." />
    <div className="settings-grid">
      <Section icon={User} title="Profile" text="Your name appears in the sidebar. Your mobile number is stored on your profile." delay={.05}>
        <form className="form-stack" onSubmit={saveProfile}>
          <div className="two"><div><label className="field-label">FIRST NAME</label><input className="text-input" value={first} onChange={e => setFirst(e.target.value)} required maxLength={40} /></div><div><label className="field-label">LAST NAME</label><input className="text-input" value={last} onChange={e => setLast(e.target.value)} maxLength={40} /></div></div>
          <label className="field-label">EMAIL <span>CANNOT BE CHANGED</span></label><input className="text-input" value={admin.email} disabled />
          <label className="field-label">MOBILE NUMBER <span>{admin.mobile ? `SAVED: ${prettyMobile(admin.mobile)}` : 'NOT SET'}</span></label>
          <PhoneInput value={mobile} onChange={setMobile} />
          <button className="primary-btn" disabled={saving || !dirty}>{saving ? <><Loader2 size={15} className="spin" /> Saving…</> : <><Check size={15} /> Save profile</>}</button>
        </form>
      </Section>
      <Section icon={User} title="Preferences" text="Small things that make PulsePost feel like yours." delay={.09}>
        <div className="toggle-row"><div><b>Sign my emails with my name</b><small>Adds “— {admin.name}” to every message you send.</small></div><Switch checked={!!admin.prefs?.signature} onChange={v => savePref('signature', v)} label="Sign emails" /></div>
        <div className="toggle-row"><div><b>Show getting-started tips</b><small>The checklist on your home page.</small></div><Switch checked={admin.prefs?.tips !== false} onChange={v => savePref('tips', v)} label="Tips" /></div>
      </Section>
      <Section icon={Lock} title="Password" text="Use at least 8 characters." delay={.12}>
        <form className="form-stack" onSubmit={changePassword}>
          <label className="field-label">CURRENT PASSWORD</label><input className="text-input" type="password" autoComplete="current-password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} required />
          <label className="field-label">NEW PASSWORD</label><input className="text-input" type="password" autoComplete="new-password" minLength={8} value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} required />
          <label className="field-label">CONFIRM NEW PASSWORD</label><input className="text-input" type="password" autoComplete="new-password" minLength={8} value={pw.again} onChange={e => setPw({ ...pw, again: e.target.value })} required />
          <button className="primary-btn" disabled={pwBusy}>{pwBusy ? <><Loader2 size={15} className="spin" /> Updating…</> : 'Update password'}</button>
        </form>
      </Section>
      <Section icon={Plug} title="Connection check" text={`The app talks to the API at “${import.meta.env.VITE_API_URL || '/api'}”. In development Vite proxies this to your Express server, so there are no CORS problems.`} delay={.2}>
        <button className="secondary-btn" onClick={check} disabled={health?.state === 'checking'}>{health?.state === 'checking' ? <><Loader2 size={15} className="spin" /> Checking…</> : 'Test API connection'}</button>
        <AnimatePresence mode="wait">{health && health.state !== 'checking' && <motion.div key={health.state} className={`alert ${health.state === 'ok' ? 'okay' : 'error'} conn`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {health.state === 'ok' ? <><Wifi size={15} /> Connected — API answered in {health.ms} ms</> : <><WifiOff size={15} /> {health.msg}</>}</motion.div>}</AnimatePresence>
      </Section>
    </div>
  </>;
}
