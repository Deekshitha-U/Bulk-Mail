import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookUser, Download, Loader2, Pencil, Phone, Plus, Search, Send, Trash2, UploadCloud, UserPlus } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { downloadTemplate, readSheet } from '../lib/contacts.js';
import { prettyMobile } from '../lib/countries.js';
import { EmptyState, PageHeading } from '../components/ui.jsx';
import { ContactModal } from '../components/Modals.jsx';

export default function Contacts({ contacts, loading, reload, onUse, toast }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(() => new Set());
  const [modal, setModal] = useState(null); // null | 'new' | contact object
  const [importing, setImporting] = useState(false);
  const shown = useMemo(() => contacts.filter(c => `${c.name} ${c.email} ${c.mobile}`.toLowerCase().includes(q.toLowerCase())), [contacts, q]);
  const allOn = shown.length > 0 && shown.every(c => sel.has(c._id));
  const withMobile = contacts.filter(c => c.mobile).length;
  const toggle = id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function save(data) {
    if (modal === 'new') { await api.post('/contacts', data); toast('Contact added.', 'success'); }
    else { await api.put('/contacts/' + modal._id, data); toast('Contact updated.', 'success'); }
    setModal(null); reload();
  }
  async function remove(c) {
    try { await api.delete('/contacts/' + c._id); toast('Contact deleted.', 'info'); setSel(s => { const n = new Set(s); n.delete(c._id); return n; }); reload(); }
    catch (e) { toast(errMsg(e), 'error'); }
  }
  async function importFile(file) {
    if (!file) return;
    setImporting(true);
    try {
      const r = await readSheet(file);
      if (!r.contacts.length) throw new Error('No valid email addresses found in that file.');
      const { data } = await api.post('/contacts/bulk', { contacts: r.contacts });
      toast(`${data.added} added, ${data.updated} updated${data.skipped + r.skipped ? `, ${data.skipped + r.skipped} skipped` : ''}${r.badMobiles ? ` · ${r.badMobiles} bad mobile number(s) ignored` : ''}.`, 'success');
      reload();
    } catch (e) { toast(e.response ? errMsg(e) : e.message, 'error'); }
    finally { setImporting(false); }
  }
  const chosen = contacts.filter(c => sel.has(c._id));

  return <>
    <PageHeading kicker="ADDRESS BOOK / CONTACTS" title="Contacts" description={`${contacts.length} contact${contacts.length === 1 ? '' : 's'} · ${withMobile} with a mobile number`}
      action={<div className="head-actions"><button className="secondary-btn" onClick={downloadTemplate}><Download size={15} /> Template</button>
        <label className={`secondary-btn ${importing ? 'busy' : ''}`}>{importing ? <Loader2 size={15} className="spin" /> : <UploadCloud size={15} />} Import Excel / CSV<input hidden type="file" accept=".xlsx,.xls,.csv,text/csv" onChange={e => { importFile(e.target.files?.[0]); e.target.value = ''; }} /></label>
        <button className="primary-btn shine" onClick={() => setModal('new')}><UserPlus size={16} /> Add contact</button></div>} />

    <div className="panel history-panel">
      <div className="history-toolbar"><div className="search-box"><Search size={16} /><input placeholder="Search name, email or mobile…" value={q} onChange={e => setQ(e.target.value)} /></div>
        <span className="result-count">{shown.length} SHOWN</span></div>
      {loading ? <div className="pad"><div className="skeleton sk-row" /><div className="skeleton sk-row" /><div className="skeleton sk-row" /></div>
        : shown.length === 0 ? <EmptyState icon={BookUser} title={contacts.length ? 'No contacts match' : 'No contacts yet'} text={contacts.length ? 'Try a different search.' : 'Add a contact, or import an Excel/CSV file with email, name and mobile columns.'} action={contacts.length ? undefined : () => setModal('new')} actionLabel="Add your first contact" />
          : <div className="table-wrap"><table className="contacts-table"><thead><tr><th><input type="checkbox" aria-label="Select all" checked={allOn} onChange={() => setSel(s => { const n = new Set(s); shown.forEach(c => allOn ? n.delete(c._id) : n.add(c._id)); return n; })} /></th><th>NAME</th><th>EMAIL</th><th>MOBILE</th><th /></tr></thead>
            <tbody><AnimatePresence initial={false}>{shown.map((c, i) => <motion.tr layout key={c._id} className={sel.has(c._id) ? 'selected' : ''} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ delay: Math.min(i, 14) * .03 }}>
              <td><input type="checkbox" aria-label={`Select ${c.email}`} checked={sel.has(c._id)} onChange={() => toggle(c._id)} /></td>
              <td><div className="table-campaign"><span className="avatar-sm">{(c.name || c.email)[0].toUpperCase()}</span><b>{c.name || <span className="muted">—</span>}</b></div></td>
              <td>{c.email}</td>
              <td>{c.mobile ? <span className="mobile-pill"><Phone size={11} /> {prettyMobile(c.mobile)}</span> : <span className="muted">—</span>}</td>
              <td className="row-actions"><button className="icon-btn" aria-label="Edit" onClick={() => setModal(c)}><Pencil size={15} /></button><button className="icon-btn danger-icon" aria-label="Delete" onClick={() => remove(c)}><Trash2 size={15} /></button></td></motion.tr>)}</AnimatePresence></tbody></table></div>}
    </div>

    <AnimatePresence>{chosen.length > 0 && <motion.div className="selection-bar" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }}>
      <b>{chosen.length}</b> selected<button className="text-btn" onClick={() => setSel(new Set())}>Clear</button>
      <button className="primary-btn" onClick={() => onUse(chosen)}><Send size={15} /> Use in a campaign</button></motion.div>}</AnimatePresence>

    <AnimatePresence>{modal && <ContactModal key={modal === 'new' ? 'new' : modal._id} initial={modal === 'new' ? null : modal} title={modal === 'new' ? 'Add a contact' : 'Edit contact'} onSave={save} onClose={() => setModal(null)} />}</AnimatePresence>
  </>;
}
