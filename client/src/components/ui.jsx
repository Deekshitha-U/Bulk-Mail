import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { Activity, Send as SendIcon, AlertTriangle, CheckCircle2, ChevronDown, Info, Search, Trash2, X } from 'lucide-react';
import { COUNTRIES, buildMobile, guessCountry, mobileProblem, splitMobile } from '../lib/countries.js';

export function Brand({ compact }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}><div className="brand-mark"><SendIcon size={17} /></div>{!compact && <span>pulsepost<span className="brand-period">.</span></span>}</div>;
}

export function PageHeading({ title, description, action }) {
  return <div className="page-heading">
    <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action && <div>{action}</div>}
  </div>;
}

/* iOS-style animated toggle (pure CSS transition). */
export function Switch({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><i /></button>;
}

export function CountUp({ value = 0, duration = .9, suffix = '' }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const controls = animate(0, Number(value) || 0, { duration, ease: 'easeOut', onUpdate: v => setN(Math.round(v)) });
    return () => controls.stop();
  }, [value, duration]);
  return <>{n.toLocaleString()}{suffix}</>;
}

export function StatCard({ label, value, sub, icon: Icon, accent, index = 0, loading }) {
  const ref = useRef(null);
  const spotlight = e => {
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mx', `${e.clientX - r.left}px`);
    ref.current.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return <motion.div ref={ref} onMouseMove={spotlight} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .07, duration: .4 }} whileHover={{ y: -4 }} className="stat-card spot">
    <div className="stat-top"><span>{label}</span><div className={`stat-icon ${accent}`}><Icon size={17} /></div></div>
    <div className="stat-value">{loading ? <span className="skeleton sk-num" /> : <CountUp value={value} />}</div>
    <div className="stat-sub">{sub}</div>
  </motion.div>;
}

export function Status({ status }) {
  const label = { sending: 'Sending', sent: 'Completed', partial: 'Partial', failed: 'Failed', pending: 'Pending' }[status] || status;
  return <span className={`status status-${status}`}><i />{label}</span>;
}

export function EmptyState({ icon: Icon, title, text, action, actionLabel = 'Start a campaign' }) {
  return <div className="empty-state">
    <motion.div className="empty-icon float" initial={{ scale: .6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }}><Icon size={22} /></motion.div>
    <b>{title}</b><p>{text}</p>
    {action && <button className="secondary-btn" onClick={action}>{actionLabel}</button>}
  </div>;
}

export function Modal({ onClose, children, width = 520, dismissible = true, label }) {
  useEffect(() => {
    if (!dismissible) return;
    const onKey = e => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, dismissible]);
  return <motion.div className="modal-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => { if (dismissible && e.target === e.currentTarget) onClose?.(); }}>
    <motion.div role="dialog" aria-modal="true" aria-label={label} className="pp-modal" style={{ width: `min(${width}px,100%)` }}
      initial={{ opacity: 0, y: 26, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 14, scale: .98 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
      {children}
    </motion.div>
  </motion.div>;
}

export function ModalHead({ title, kicker, onClose }) {
  return <div className="modal-head"><div>{kicker && <div className="eyebrow">{kicker}</div>}<h2>{title}</h2></div>{onClose && <button className="icon-btn" aria-label="Close" onClick={onClose}><X /></button>}</div>;
}

/* Mobile-number input with a searchable country-code picker. value / onChange use E.164 ("+919876543210"). */
export function PhoneInput({ value, onChange, autoFocus, required }) {
  const initial = useMemo(() => splitMobile(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [iso, setIso] = useState(initial.iso || guessCountry());
  const [national, setNational] = useState(initial.national);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [touched, setTouched] = useState(false);
  const wrap = useRef(null);
  const country = COUNTRIES.find(c => c.iso === iso) || COUNTRIES[0];

  useEffect(() => {
    if (!open) return;
    const off = e => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open]);

  const emit = (nextIso, nextNational) => onChange(buildMobile(nextIso, nextNational));
  const e164 = buildMobile(iso, national);
  const problem = touched || national.length > 6 ? mobileProblem(e164) : '';
  const list = COUNTRIES.filter(c => `${c.name} ${c.dial} ${c.iso}`.toLowerCase().includes(q.toLowerCase()));

  return <div className="phone-field" ref={wrap}>
    <div className={`phone-row ${problem ? 'invalid' : ''}`}>
      <button type="button" className="country-btn" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="flag">{country.flag}</span><b>+{country.dial}</b><ChevronDown size={14} className={open ? 'flip' : ''} />
      </button>
      <input type="tel" inputMode="numeric" autoComplete="tel-national" autoFocus={autoFocus} required={required} placeholder="Mobile number" value={national}
        onChange={e => { const v = e.target.value.replace(/[^\d\s-]/g, ''); setNational(v); emit(iso, v); }} onBlur={() => setTouched(true)} />
    </div>
    <AnimatePresence>
      {open && <motion.div className="country-pop" initial={{ opacity: 0, y: -6, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .15 }}>
        <div className="country-search"><Search size={14} /><input autoFocus placeholder="Search country or code" value={q} onChange={e => setQ(e.target.value)} /></div>
        <ul role="listbox">{list.map(c => <li key={c.iso}><button type="button" role="option" aria-selected={c.iso === iso} className={c.iso === iso ? 'on' : ''} onClick={() => { setIso(c.iso); setOpen(false); setQ(''); emit(c.iso, national); }}><span className="flag">{c.flag}</span><span>{c.name}</span><em>+{c.dial}</em></button></li>)}
          {!list.length && <li className="muted pad">No match</li>}</ul>
      </motion.div>}
    </AnimatePresence>
    <AnimatePresence>{problem && <motion.small className="field-error" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>{problem}</motion.small>}</AnimatePresence>
  </div>;
}

const TOAST_ICON = { success: CheckCircle2, error: AlertTriangle, info: Info };
export function ToastHost({ toasts, dismiss }) {
  return <div className="toast-stack" aria-live="polite">
    <AnimatePresence initial={false}>
      {toasts.map(t => { const Icon = TOAST_ICON[t.type] || Info; return <motion.div layout key={t.id} className={`toast-item ${t.type}`} role="status"
        initial={{ opacity: 0, x: 60, scale: .95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60, scale: .95 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} onClick={() => dismiss(t.id)}>
        <Icon size={17} /><span>{t.msg}</span><i className="toast-bar" />
      </motion.div>; })}
    </AnimatePresence>
  </div>;
}

/* Two-step delete: first click arms it ("Click again to delete"), second click confirms. Disarms itself after 3 s.
   Plain CSS transitions on purpose: nested animation-presence inside a row that unmounts mid-click can stall page transitions. */
export function DeleteButton({ onConfirm, disabled, label = '', title = 'Delete' }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  async function click(e) {
    e.stopPropagation();
    if (disabled || busy) return;
    if (!armed) return setArmed(true);
    setBusy(true);
    try { await onConfirm(); }
    finally { if (alive.current) { setBusy(false); setArmed(false); } }
  }
  const text = armed ? 'Click again to delete' : label;
  return <button type="button" className={`del-btn ${armed ? 'armed' : ''}`} onClick={click} disabled={disabled} aria-label={armed ? `Confirm: ${title}` : title} title={disabled ? 'Not available while sending' : title}>
    <Trash2 size={15} className={busy ? 'spin' : ''} />
    <span className={`del-label ${text ? 'show' : ''}`}>{text}</span>
  </button>;
}
