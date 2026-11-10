import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, RefreshCw, Rocket, XCircle } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { CountUp } from './ui.jsx';

const R = 62, C = 2 * Math.PI * R;

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * Math.PI * 2 + Math.random() * .5, d = 120 + Math.random() * 190;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d - 40, r: Math.random() * 720 - 360, c: ['#a18cff', '#71d6a1', '#ffad79', '#83baff', '#f2b6a4'][i % 5], w: 5 + Math.random() * 6 };
  }), []);
  return <div className="confetti" aria-hidden="true">{bits.map((b, i) =>
    <motion.i key={i} style={{ background: b.c, width: b.w, height: b.w * 1.7 }} initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{ x: b.x, y: [0, b.y, b.y + 120], opacity: [1, 1, 0], rotate: b.r }} transition={{ duration: 1.5, ease: 'easeOut' }} />)}</div>;
}

export default function LaunchOverlay({ campaign: initial, onClose, onViewReport, onChanged, toast }) {
  const [c, setC] = useState(initial);
  const [retrying, setRetrying] = useState(false);
  const stop = useRef(false);
  const sending = c.status === 'sending';
  const total = c.totalRecipients || 1;
  const done = (c.sentCount || 0) + (c.failedCount || 0);
  const pct = Math.min(100, Math.round((done / total) * 100));

  useEffect(() => {
    stop.current = false;
    if (!sending) return;
    let misses = 0;
    const tick = async () => {
      try {
        const { data } = await api.get(`/campaigns/${c._id}`);
        if (stop.current) return;
        misses = 0;
        setC(data.campaign);
        if (data.campaign.status !== 'sending') onChanged?.();
      } catch (e) { if (++misses === 6) toast(errMsg(e), 'error'); }
    };
    const id = setInterval(tick, 700);
    return () => { stop.current = true; clearInterval(id); };
  }, [c._id, sending]); // eslint-disable-line react-hooks/exhaustive-deps

  async function retry() {
    setRetrying(true);
    try { const { data } = await api.post(`/campaigns/${c._id}/retry`); setC(data.campaign); }
    catch (e) { toast(errMsg(e), 'error'); }
    finally { setRetrying(false); }
  }

  const ok = !sending && c.sentCount > 0;
  return <motion.div className="launch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <div className="launch-stars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
    <motion.div className="launch-card" initial={{ y: 30, scale: .96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
      <div className="eyebrow">{sending ? 'LAUNCH IN PROGRESS' : ok ? 'MISSION COMPLETE' : 'LAUNCH ENDED'}</div>
      <h2>{sending ? <>Sending to <em>{c.totalRecipients}</em> people…</> : ok ? <>Delivered to <em>{c.sentCount}</em> of {c.totalRecipients}</> : <>Nothing was accepted</>}</h2>

      <div className="ring-wrap">
        <svg viewBox="0 0 150 150" className="ring">
          <circle cx="75" cy="75" r={R} className="ring-bg" />
          <motion.circle cx="75" cy="75" r={R} className="ring-fg" strokeDasharray={C} animate={{ strokeDashoffset: C - (C * pct) / 100 }} transition={{ ease: 'easeOut', duration: .5 }} />
        </svg>
        <div className="ring-center">
          <AnimatePresence mode="wait">
            {sending ? <motion.div key="r" className="rocket" animate={{ y: [0, -6, 0], rotate: [0, -3, 3, 0] }} transition={{ repeat: Infinity, duration: 1.3 }} exit={{ y: -90, opacity: 0, scale: .6, transition: { duration: .35, repeat: 0 } }}>
              <Rocket size={34} /><span className="flame" />
            </motion.div>
              : <motion.div key="d" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className={ok ? 'done-ok' : 'done-bad'}>
                {ok ? <CheckCircle2 size={44} /> : <XCircle size={44} />}</motion.div>}
          </AnimatePresence>
          <b className="ring-pct"><CountUp value={pct} duration={.4} suffix="%" /></b>
        </div>
        {ok && <Confetti />}
      </div>

      <div className="launch-stats">
        <div><b className="green-text">{c.sentCount}</b><small>ACCEPTED</small></div>
        <div><b className="orange-text">{c.failedCount}</b><small>FAILED</small></div>
        <div><b>{Math.max(0, c.totalRecipients - done)}</b><small>QUEUED</small></div>
      </div>

      <div className="dots" aria-label="Per-recipient progress">
        {c.recipients.slice(0, 160).map(r => <motion.i key={r.email} title={`${r.email} — ${r.status}`} className={`dot ${r.status}`} layout animate={{ scale: r.status === 'pending' ? 1 : [1.7, 1] }} transition={{ duration: .35 }} />)}
        {c.recipients.length > 160 && <span className="muted">+{c.recipients.length - 160}</span>}
      </div>

      <div className="launch-actions">
        {!sending && c.failedCount + c.recipients.filter(r => r.status === 'pending').length > 0 && <button className="secondary-btn" onClick={retry} disabled={retrying}><RefreshCw size={15} className={retrying ? 'spin' : ''} /> Retry failed</button>}
        {!sending && <button className="secondary-btn" onClick={() => onViewReport(c)}>View report</button>}
        <button className="primary-btn" onClick={() => onClose(c)}>{sending ? 'Hide (keeps sending)' : 'Done'}</button>
      </div>
    </motion.div>
  </motion.div>;
}
