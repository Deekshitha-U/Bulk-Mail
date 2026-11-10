import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock3, Inbox, Loader2, Mail, Phone, RefreshCw, Search, Trash2, X, FileText } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { prettyDate } from '../lib/contacts.js';
import { prettyMobile } from '../lib/countries.js';
import { CountUp, DeleteButton, EmptyState, Modal, ModalHead, PageHeading, Status } from '../components/ui.jsx';

const FILTERS = [['all', 'All'], ['sent', 'Completed'], ['partial', 'Partial'], ['failed', 'Failed'], ['sending', 'Sending']];

export function History({ campaigns, search, setSearch, onOpen, onDelete, loading }) {
  const [filter, setFilter] = useState('all');
  const filtered = useMemo(() => campaigns.filter(c => (filter === 'all' || c.status === filter) && c.subject.toLowerCase().includes(search.toLowerCase())), [campaigns, filter, search]);
  return <>
    <PageHeading kicker="OUTBOX / ARCHIVE" title="Sent campaigns" description="Review previous campaigns and inspect individual recipient outcomes." />
    <div className="panel history-panel">
      <div className="history-toolbar">
        <div className="search-box"><Search size={16} /><input placeholder="Search by campaign subject…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="filter-chips">{FILTERS.map(([k, label]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{filter === k && <motion.i layoutId="filter-pill" />}<span>{label}</span></button>)}</div>
        <span className="result-count"><CountUp value={filtered.length} duration={.3} /> CAMPAIGNS</span>
      </div>
      {loading ? <div className="pad"><div className="skeleton sk-row" /><div className="skeleton sk-row" /><div className="skeleton sk-row" /></div>
        : filtered.length === 0 ? <EmptyState icon={Inbox} title="Nothing in this view" text="Try another search or filter, or send your first campaign." />
          : <div className="table-wrap"><table><thead><tr><th>CAMPAIGN</th><th>DATE</th><th>RECIPIENTS</th><th>ACCEPTED</th><th>STATUS</th><th /><th /></tr></thead>
            <tbody>{filtered.map((c, i) => <motion.tr key={c._id} onClick={() => onOpen(c)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 14) * .04 }}>
              <td><div className="table-campaign"><span className="table-icon"><Mail size={15} /></span><b>{c.subject}</b></div></td><td>{prettyDate(c.createdAt)}</td><td>{c.totalRecipients}</td>
              <td><span className="accepted-count">{c.sentCount}</span> <span className="muted">/ {c.totalRecipients}</span></td><td><Status status={c.status} /></td><td className="row-actions" onClick={e => e.stopPropagation()}><DeleteButton title={`Delete "${c.subject}"`} disabled={c.status === 'sending'} onConfirm={() => onDelete(c)} /></td><td><ArrowRight size={15} /></td></motion.tr>)}</tbody></table></div>}
    </div>
  </>;
}

export function CampaignDetail({ campaign: initial, onClose, onChanged, toast }) {
  const [c, setC] = useState(initial);
  const [retrying, setRetrying] = useState(false);
  const fetchIt = () => api.get('/campaigns/' + initial._id).then(r => { setC(r.data.campaign); return r.data.campaign; });
  useEffect(() => { fetchIt().catch(() => {}); }, [initial._id]); // eslint-disable-line
  useEffect(() => {
    if (c.status !== 'sending') return;
    const id = setInterval(() => fetchIt().then(x => x.status !== 'sending' && onChanged?.()).catch(() => {}), 1000);
    return () => clearInterval(id);
  }, [c.status]); // eslint-disable-line
  const retryable = (c.recipients || []).filter(r => r.status !== 'sent').length;
  async function retry() {
    setRetrying(true);
    try { const { data } = await api.post(`/campaigns/${c._id}/retry`); setC(data.campaign); toast(data.message, 'info'); onChanged?.(); }
    catch (e) { toast(errMsg(e), 'error'); } finally { setRetrying(false); }
  }
  async function remove() {
    try { await api.delete('/campaigns/' + c._id); toast('Campaign deleted.', 'info'); onChanged?.(); onClose(); }
    catch (e) { toast(errMsg(e), 'error'); }
  }
  return <Modal onClose={onClose} width={640} label="Campaign report">
    <ModalHead kicker="CAMPAIGN REPORT" title={c.subject} onClose={onClose} />
    <div className="detail-stats"><div><b><CountUp value={c.totalRecipients} duration={.5} /></b><small>RECIPIENTS</small></div><div><b className="green-text"><CountUp value={c.sentCount} duration={.5} /></b><small>ACCEPTED</small></div><div><b className="orange-text"><CountUp value={c.failedCount} duration={.5} /></b><small>FAILED</small></div></div>
    <div className="recipient-report">{c.recipients?.map((r, i) => <motion.div key={r.email} className="report-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 15) * .025 }}>
      <span className={`report-status ${r.status}`}>{r.status === 'sent' ? <CheckCircle2 size={16} /> : r.status === 'failed' ? <X size={16} /> : <Clock3 size={16} />}</span>
      <div><b>{r.name ? `${r.name} · ` : ''}{r.email}</b>{r.mobile && <small className="mob"><Phone size={10} /> {prettyMobile(r.mobile)}</small>}{r.error && <small>{r.error}</small>}</div>
      <span className={`report-label ${r.status}`}>{r.status}</span></motion.div>)}</div>
    <div className="modal-foot"><span>{prettyDate(c.createdAt)}</span><div className="foot-actions"><DeleteButton label="Delete" title="Delete this campaign" disabled={c.status === 'sending'} onConfirm={remove} />{retryable > 0 && c.status !== 'sending' && <button className="secondary-btn" onClick={retry} disabled={retrying}><RefreshCw size={14} className={retrying ? 'spin' : ''} /> Retry {retryable}</button>}<Status status={c.status} /></div></div>
  </Modal>;
}

export function Drafts({ drafts, onLoad, onDelete }) {
  return <>
    <PageHeading kicker="WORK IN PROGRESS / DRAFTS" title="Not ready to send? Keep it here." description="Your unfinished messages, ready when you are." />
    <div className="draft-grid">{drafts.length === 0 ? <div className="panel draft-empty"><EmptyState icon={FileText} title="No drafts yet" text="Save a campaign from the studio and it will be waiting here." /></div>
      : <AnimatePresence>{drafts.map((d, i) => <motion.div layout key={d._id} className="draft-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .9 }} transition={{ delay: Math.min(i, 8) * .05 }} whileHover={{ y: -3 }}>
        <div className="draft-card-top"><span className="draft-icon"><FileText size={18} /></span><button className="icon-btn danger-icon" aria-label="Delete draft" onClick={() => onDelete(d._id)}><Trash2 size={16} /></button></div>
        <h3>{d.subject || 'Untitled draft'}</h3><p>{d.body || 'No message content yet.'}</p>
        <div className="draft-card-foot"><span>{d.contacts?.length || d.recipients.length} recipients · {prettyDate(d.updatedAt)}</span><button className="text-btn" onClick={() => onLoad(d)}>Continue <ArrowRight size={14} /></button></div></motion.div>)}</AnimatePresence>}</div>
  </>;
}
