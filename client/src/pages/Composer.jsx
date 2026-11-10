import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookUser, Check, CheckCircle2, ChevronDown, Download, FileText, Loader2, Phone, Plus, Search, Send, Sparkles, UploadCloud, UserPlus, Users, X, Activity } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { downloadTemplate, mergeContacts, parseEntry, personalize, readSheet, toContact, validEmail } from '../lib/contacts.js';
import { mobileProblem, prettyMobile } from '../lib/countries.js';
import { Modal, ModalHead, PageHeading } from '../components/ui.jsx';
import { ContactModal } from '../components/Modals.jsx';

const MAX = 500;
const FIELDS = ['{{name}}', '{{email}}', '{{mobile}}'];

function ContactPicker({ contacts, onAdd, onClose }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(() => new Set());
  const shown = contacts.filter(c => `${c.name} ${c.email} ${c.mobile}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = email => setSel(s => { const n = new Set(s); n.has(email) ? n.delete(email) : n.add(email); return n; });
  const allOn = shown.length > 0 && shown.every(c => sel.has(c.email));
  return <Modal onClose={onClose} width={560} label="Choose contacts">
    <ModalHead kicker="ADDRESS BOOK" title="Add from contacts" onClose={onClose} />
    {contacts.length === 0 ? <p className="muted pad">You have no saved contacts yet. Add some on the Contacts page.</p> : <>
      <div className="search-box"><Search size={16} /><input autoFocus placeholder="Search name, email or number…" value={q} onChange={e => setQ(e.target.value)} /></div>
      <label className="pick-all"><input type="checkbox" checked={allOn} onChange={() => setSel(s => { const n = new Set(s); shown.forEach(c => allOn ? n.delete(c.email) : n.add(c.email)); return n; })} /> Select all {shown.length} shown</label>
      <div className="pick-list">{shown.map((c, i) => <motion.label key={c._id} className={`pick-row ${sel.has(c.email) ? 'on' : ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * .02 }}>
        <input type="checkbox" checked={sel.has(c.email)} onChange={() => toggle(c.email)} />
        <span className="avatar-sm">{(c.name || c.email)[0].toUpperCase()}</span>
        <span className="pick-main"><b>{c.name || c.email}</b><small>{c.name ? c.email : ''}{c.mobile ? ` · ${prettyMobile(c.mobile)}` : ''}</small></span>
      </motion.label>)}</div></>}
    <div className="modal-actions"><button className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" disabled={!sel.size} onClick={() => onAdd(contacts.filter(c => sel.has(c.email)))}>Add {sel.size || ''} to campaign</button></div>
  </Modal>;
}

export default function Composer({ drafts, draftToLoad, contacts, preset, onPresetUsed, onLaunched, onDraft, toast }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [entry, setEntry] = useState('');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [modal, setModal] = useState(null); // 'add' | 'pick' | null
  const [drag, setDrag] = useState(false);
  const bodyRef = useRef(null);
  const recRef = useRef([]);
  recRef.current = recipients;

  const loadDraft = d => {
    setSubject(d.subject || ''); setBody(d.body || '');
    setRecipients((d.contacts?.length ? d.contacts : d.recipients || []).map(toContact)); setStep(1);
  };
  useEffect(() => { if (draftToLoad) loadDraft(draftToLoad); }, [draftToLoad]);
  useEffect(() => { if (preset?.length) { addContacts(preset, 'from your contacts'); onPresetUsed(); } }, [preset]); // eslint-disable-line react-hooks/exhaustive-deps

  const problems = useMemo(() => ({
    email: recipients.filter(r => !validEmail(r.email)),
    mobile: recipients.filter(r => r.mobile && mobileProblem(r.mobile)),
  }), [recipients]);
  const withMobile = recipients.filter(r => r.mobile).length;
  const canReview = subject.trim() && body.trim() && recipients.length > 0 && !problems.email.length && !problems.mobile.length && recipients.length <= MAX;

  function addContacts(list, where = '') {
    const { list: next, added, duplicates } = mergeContacts(recRef.current, list);
    recRef.current = next;
    setRecipients(next);
    toast(`${added} added${duplicates ? `, ${duplicates} duplicate${duplicates > 1 ? 's' : ''} merged` : ''}${where ? ` ${where}` : ''}.`, added ? 'success' : 'info');
  }
  function addEntry() {
    const found = parseEntry(entry);
    if (!found.length) return toast('No email address found in that text.', 'error');
    addContacts(found); setEntry('');
  }
  async function importFile(file) {
    if (!file) return;
    setImporting(true);
    try {
      const r = await readSheet(file);
      if (!r.contacts.length) throw new Error('No valid email addresses found in that file.');
      addContacts(r.contacts, `from ${file.name}`);
      const notes = [r.skipped && `${r.skipped} row(s) skipped (no valid email)`, r.badMobiles && `${r.badMobiles} unusable mobile number(s) ignored`].filter(Boolean);
      if (notes.length) setTimeout(() => toast(notes.join(' · '), 'info'), 400);
    } catch (e) { toast(e.message || 'Could not read that file.', 'error'); }
    finally { setImporting(false); }
  }
  function insertField(tag) {
    const el = bodyRef.current; const s = el?.selectionStart ?? body.length; const e = el?.selectionEnd ?? body.length;
    setBody(b => b.slice(0, s) + tag + b.slice(e));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(s + tag.length, s + tag.length); });
  }
  async function send() {
    setBusy(true);
    try { const { data } = await api.post('/campaigns/send', { subject, body, recipients }); onLaunched(data.campaign); }
    catch (e) { toast(errMsg(e, 'Campaign could not be sent.'), 'error'); }
    finally { setBusy(false); }
  }

  const sample = recipients[0];
  return <>
    <PageHeading kicker="CAMPAIGN OPERATIONS / COMPOSER" title="Campaign studio" description="One message, the right people, a clear reason to reach out."
      action={<button className="secondary-btn" onClick={() => setShowDrafts(!showDrafts)}><FileText size={16} /> {showDrafts ? 'Hide drafts' : 'Saved drafts'} <ChevronDown size={14} className={showDrafts ? 'flip' : ''} /></button>} />
    <AnimatePresence>{showDrafts && <motion.div className="draft-strip" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      {drafts.length ? drafts.map(d => <button key={d._id} onClick={() => { loadDraft(d); setShowDrafts(false); }}><FileText size={15} /><span>{d.subject || 'Untitled draft'}</span><ArrowRight size={14} /></button>) : <span className="muted">No saved drafts yet.</span>}
    </motion.div>}</AnimatePresence>

    <div className="composer-layout"><section className="panel composer-panel">
      <div className="stepper">
        <div className={`step ${step === 1 ? 'current' : 'done'}`}><span>{step > 1 ? <Check size={13} /> : '01'}</span> MESSAGE</div>
        <div className="step-line"><motion.i animate={{ width: step > 1 ? '100%' : '0%' }} /></div>
        <div className={`step ${step === 2 ? 'current' : ''}`}><span>02</span> REVIEW & SEND</div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? <motion.div key="s1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .2 }}>
          <div className="field-block"><label className="field-label">EMAIL SUBJECT <span>{subject.length}/180</span></label><input className="text-input" maxLength="180" placeholder="A subject worth opening…" value={subject} onChange={e => setSubject(e.target.value)} /></div>
          <div className="field-block"><label className="field-label">MESSAGE BODY <span>PLAIN TEXT</span></label>
            <div className="merge-bar"><span>PERSONALIZE</span>{FIELDS.map(f => <button key={f} type="button" className="merge-chip" onClick={() => insertField(f)}>{f}</button>)}</div>
            <textarea ref={bodyRef} className="body-input" maxLength="20000" placeholder={'Hi {{name}},\n\nWrite something useful, relevant, and human…\n\nBest,\nYour name'} value={body} onChange={e => setBody(e.target.value)} />
            <div className="input-foot"><span>Plain text · merge fields work in the subject too</span><span>{body.length.toLocaleString()} / 20,000</span></div></div>

          <div className="field-block"><div className="field-label">RECIPIENTS <span>{recipients.length} ADDED · {withMobile} WITH MOBILE · MAX {MAX}</span></div>
            <div className={`recipient-box ${drag ? 'drag' : ''}`} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); importFile(e.dataTransfer.files?.[0]); }}>
              <div className="recipient-chips"><AnimatePresence>{recipients.map(r => {
                const bad = !validEmail(r.email) || (r.mobile && mobileProblem(r.mobile));
                return <motion.span layout key={r.email} className={`recipient-chip ${bad ? 'bad' : ''}`} initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .6 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                  {r.name ? `${r.name} · ` : ''}{r.email}{r.mobile && <em><Phone size={9} />{prettyMobile(r.mobile)}</em>}
                  <button aria-label={`Remove ${r.email}`} onClick={() => setRecipients(p => p.filter(x => x.email !== r.email))}><X size={12} /></button></motion.span>;
              })}</AnimatePresence></div>
              <div className="recipient-entry"><input value={entry} placeholder="Paste emails — add a mobile after an email, e.g. asha@x.com +91 98765 43210" onChange={e => setEntry(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEntry(); } }} onPaste={e => { const t = e.clipboardData.getData('text'); if (/[\n,;]/.test(t) && parseEntry(t).length > 1) { e.preventDefault(); addContacts(parseEntry(t)); } }} /><button className="mini-add" onClick={addEntry}><Plus size={15} /> Add</button></div>
              {drag && <div className="drop-hint"><UploadCloud size={22} /> Drop your Excel or CSV file</div>}
            </div>
            <div className="recipient-tools">
              <label className={`upload-btn ${importing ? 'busy' : ''}`}>{importing ? <Loader2 size={15} className="spin" /> : <UploadCloud size={15} />} Import Excel / CSV<input type="file" hidden accept=".xlsx,.xls,.csv,text/csv" onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }} /></label>
              <button className="upload-btn" onClick={() => setModal('pick')}><BookUser size={15} /> From contacts</button>
              <button className="upload-btn" onClick={() => setModal('add')}><UserPlus size={15} /> Add with mobile</button>
              <button className="text-btn" onClick={downloadTemplate}><Download size={13} /> Template</button>
              <span className="grow" /><button className="text-btn" onClick={() => setRecipients([])}>Clear all</button>
            </div>
            <small className="muted hint">Columns recognised: <b>email</b>, <b>name</b>, <b>mobile / phone</b>. Numbers without a country code use your region.</small>
            <AnimatePresence>
              {problems.email.length > 0 && <motion.div className="alert error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{problems.email.length} invalid email address(es): {problems.email.map(r => r.email).join(', ')}</motion.div>}
              {problems.mobile.length > 0 && <motion.div className="alert error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{problems.mobile.length} invalid mobile number(s): {problems.mobile.map(r => `${r.email} (${r.mobile})`).join(', ')}. Remove the contact and add it again with a correct number.</motion.div>}
            </AnimatePresence>
          </div>
          <div className="composer-actions"><button className="secondary-btn" onClick={() => onDraft({ subject, body, contacts: recipients })}><FileText size={16} /> Save draft</button><button className="primary-btn shine" disabled={!canReview} onClick={() => setStep(2)}>Review campaign <ArrowRight size={16} /></button></div>
        </motion.div>
          : <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: .2 }}>
            <div className="review-banner"><div className="review-check"><Check size={20} /></div><div><b>Ready for a final look</b><span>Your campaign will be sent individually to each recipient.</span></div></div>
            <div className="review-field"><small>SUBJECT {sample && '· PREVIEW FOR ' + sample.email.toUpperCase()}</small><b>{sample ? personalize(subject, sample) : subject}</b></div>
            <div className="review-field"><small>MESSAGE PREVIEW</small><p>{sample ? personalize(body, sample) : body}</p></div>
            <div className="review-field"><small>RECIPIENTS · {recipients.length}</small><div className="review-recipients">{recipients.map((r, i) => <motion.span key={r.email} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 20) * .02 }}>{r.name ? `${r.name} · ` : ''}{r.email}{r.mobile ? ` · ${prettyMobile(r.mobile)}` : ''}</motion.span>)}</div></div>
            <div className="alert warning"><Activity size={16} /> Sending starts immediately. Verify every address and confirm recipients have opted in.</div>
            <div className="composer-actions"><button className="secondary-btn" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back to edit</button><button className="primary-btn shine" disabled={busy} onClick={send}>{busy ? <><Loader2 size={16} className="spin" /> Launching…</> : <><Send size={16} /> Launch campaign</>}</button></div>
          </motion.div>}
      </AnimatePresence>
    </section>

    <aside className="composer-aside">
      <div className="aside-card dark-card"><div className="aside-orb" /><div className="eyebrow">CAMPAIGN CHECKLIST</div><h3>Good email.<br /><em>Good timing.</em></h3>
        <ul>{[['Clear, useful subject', subject.trim()], ['Relevant message', body.trim()], ['Valid recipient list', recipients.length && !problems.email.length && !problems.mobile.length], ['Consent to contact', false]].map(([t, ok]) => <li key={t} className={ok ? 'ok' : ''}><CheckCircle2 size={15} /> {t}</li>)}</ul></div>
      <div className="aside-card"><div className="aside-icon"><Users size={17} /></div><div className="eyebrow">RECIPIENT CAPACITY</div><div className="capacity">{recipients.length}<span> / {MAX}</span></div><div className="capacity-track"><span style={{ width: `${Math.min(recipients.length / MAX * 100, 100)}%` }} /></div><p>Addresses are deduplicated before sending. {withMobile} of {recipients.length} have a mobile number.</p></div>
      <div className="aside-tip"><Sparkles size={16} /><p><b>A small reminder</b><br />Personal, permission-based messages build better relationships than volume alone.</p></div>
    </aside></div>

    <AnimatePresence>
      {modal === 'add' && <ContactModal title="Add a recipient" saveLabel="Add to campaign" onClose={() => setModal(null)} onSave={c => { addContacts([c]); setModal(null); }} />}
      {modal === 'pick' && <ContactPicker contacts={contacts} onClose={() => setModal(null)} onAdd={list => { addContacts(list); setModal(null); }} />}
    </AnimatePresence>
  </>;
}
