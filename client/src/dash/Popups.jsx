import { useEffect, useState } from 'react';
import { Loader2, PenLine, Sparkles } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { Modal, Switch } from '../components/ui.jsx';

/* Full-screen "Getting things ready…" loader shown once after each sign-in. */
export function GettingReady({ onDone }) {
  const msgs = ['Getting things ready…', 'Warming up your workspace…', 'Loading your contacts & campaigns…', 'Almost there…'];
  const [i, setI] = useState(0); const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const a = setInterval(() => setI(x => Math.min(x + 1, msgs.length - 1)), 650);
    const b = setTimeout(() => setLeaving(true), 2400);
    const c = setTimeout(onDone, 2850);
    return () => { clearInterval(a); clearTimeout(b); clearTimeout(c); };
  }, []); // eslint-disable-line
  return <div className={`boot ${leaving ? 'leave' : ''}`} role="status" aria-live="polite">
    <div className="boot-orbit"><i className="o1" /><i className="o2" /><div className="rocket">🚀</div></div>
    <h2 key={i}>{msgs[i]}</h2>
    <div className="boot-bar"><i /></div>
  </div>;
}

/* Asks for first + last name right after login, with animated toggles. */
export function NameModal({ admin, onSaved, toast }) {
  const [first, setFirst] = useState(admin.firstName || ''); const [last, setLast] = useState(admin.lastName || '');
  const [signature, setSignature] = useState(true); const [tips, setTips] = useState(true); const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault(); if (!first.trim()) return toast('Please enter your first name.', 'error');
    setBusy(true);
    try {
      const { data } = await api.put('/auth/profile', { firstName: first, lastName: last, onboarded: true, prefs: { signature, tips } });
      onSaved(data.admin); toast(`Nice to meet you, ${data.admin.firstName}!`, 'success');
    } catch (ex) { toast(errMsg(ex), 'error'); } finally { setBusy(false); }
  }
  return <Modal dismissible={false} width={480} label="Tell us your name">
    <form className="name-modal" onSubmit={save}>
      <div className="wave">👋</div>
      <h2>Welcome! What should we call you?</h2>
      <p className="muted">This personalises your dashboard and the emails you send.</p>
      <div className="two"><div><label className="field-label">FIRST NAME</label><input className="text-input" autoFocus value={first} onChange={e => setFirst(e.target.value)} maxLength={40} placeholder="Deekshitha" /></div>
        <div><label className="field-label">LAST NAME</label><input className="text-input" value={last} onChange={e => setLast(e.target.value)} maxLength={40} placeholder="Optional" /></div></div>
      <div className="toggle-row"><div><b><PenLine size={14} /> Sign my emails with my name</b><small>Adds “— {first || 'Your name'} {last}” to the end of each message.</small></div><Switch checked={signature} onChange={setSignature} label="Sign emails" /></div>
      <div className="toggle-row"><div><b><Sparkles size={14} /> Send me helpful tips</b><small>Short pointers inside the dashboard.</small></div><Switch checked={tips} onChange={setTips} label="Tips" /></div>
      <button className="primary-btn wide" disabled={busy}>{busy ? <><Loader2 size={15} className="spin" /> Saving…</> : 'Continue to dashboard'}</button>
    </form>
  </Modal>;
}
