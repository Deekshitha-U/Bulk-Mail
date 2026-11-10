import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, Smartphone } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { validEmail } from '../lib/contacts.js';
import { mobileProblem } from '../lib/countries.js';
import { Modal, ModalHead, PhoneInput } from './ui.jsx';

/* Add / edit a contact. onSave receives { name, email, mobile } and may be async (throw to show an error). */
export function ContactModal({ initial, title = 'Add a contact', saveLabel = 'Save contact', onSave, onClose }) {
  const [form, setForm] = useState({ name: initial?.name || '', email: initial?.email || '', mobile: initial?.mobile || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!validEmail(email)) return setError('Enter a valid email address.');
    const bad = mobileProblem(form.mobile);
    if (bad) return setError(bad);
    setBusy(true); setError('');
    try { await onSave({ name: form.name.trim(), email, mobile: form.mobile }); }
    catch (err) { setError(errMsg(err)); setBusy(false); }
  }
  return <Modal onClose={onClose} width={480} label={title}>
    <ModalHead kicker="CONTACT" title={title} onClose={onClose} />
    <form className="form-stack" onSubmit={submit}>
      <label className="field-label">NAME <span>OPTIONAL</span></label>
      <input className="text-input" autoFocus placeholder="Asha Rao" value={form.name} onChange={e => set('name')(e.target.value)} maxLength={100} />
      <label className="field-label">EMAIL <span>REQUIRED</span></label>
      <input className="text-input" type="email" placeholder="asha@example.com" value={form.email} onChange={e => set('email')(e.target.value)} required />
      <label className="field-label">MOBILE NUMBER <span>OPTIONAL · INCLUDES COUNTRY CODE</span></label>
      <PhoneInput value={form.mobile} onChange={set('mobile')} />
      <AnimatePresence>{error && <motion.div className="alert error" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: [0, -6, 6, -4, 0] }} exit={{ opacity: 0 }}>{error}</motion.div>}</AnimatePresence>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? <><Loader2 size={15} className="spin" /> Saving…</> : saveLabel}</button></div>
    </form>
  </Modal>;
}

/* Shown right after sign-in when the admin has no mobile number yet. */
export function PhonePrompt({ onSaved, onSkip, toast }) {
  const [mobile, setMobile] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const perks = ['Complete your admin profile', 'Keep a contact number on your account', 'Stored privately — never shared'];

  async function save(e) {
    e.preventDefault();
    const bad = !mobile ? 'Enter your mobile number.' : mobileProblem(mobile);
    if (bad) return setError(bad);
    setBusy(true); setError('');
    try { const { data } = await api.put('/auth/profile', { mobile }); onSaved(data.admin); toast('Mobile number saved to your profile.', 'success'); }
    catch (err) { setError(errMsg(err)); setBusy(false); }
  }
  return <Modal onClose={onSkip} width={500} label="Add a mobile number">
    <ModalHead title="Add a mobile number" onClose={onSkip} />
    <div className="perk-head"><motion.span className="perk-badge" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: .1 }}><Smartphone size={18} /></motion.span><p className="muted">Add it once and it stays on your profile.</p></div>
    <ul className="perks">{perks.map((p, i) => <motion.li key={p} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .15 + i * .12 }}><span className="tick"><Check size={13} /></span>{p}</motion.li>)}</ul>
    <form className="form-stack" onSubmit={save}>
      <label className="field-label">MOBILE NUMBER <span className="req">*</span></label>
      <PhoneInput value={mobile} onChange={setMobile} autoFocus />
      <AnimatePresence>{error && <motion.div className="alert error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{error}</motion.div>}</AnimatePresence>
      <button className="primary-btn full" disabled={busy}>{busy ? <><Loader2 size={15} className="spin" /> Saving…</> : 'Save mobile number'}</button>
      <button type="button" className="ghost-btn full" onClick={onSkip}>Maybe later</button>
    </form>
  </Modal>;
}
