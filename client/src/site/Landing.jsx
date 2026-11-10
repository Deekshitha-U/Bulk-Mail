import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, FileSpreadsheet, Gauge, Mail, Menu, Send, ShieldCheck, Smartphone, Sparkles, Trash2, X, Zap } from 'lucide-react';
import { Brand } from '../components/ui.jsx';
import { useApp } from '../store.jsx';

function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!('IntersectionObserver' in window)) return setOn(true);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: .12 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${on ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

const NAMES = [['Asha', 'Mumbai'], ['Ravi', 'Chennai'], ['Meera', 'Bengaluru'], ['Karan', 'Delhi'], ['Divya', 'Hyderabad'], ['Imran', 'Pune'], ['Sana', 'Kochi'], ['Arjun', 'Jaipur']];
const TICKS = [
  'sent a 240-contact Diwali offer', 'imported leads.xlsx · 1,180 rows', 'launched a webinar invite to 64 people', 'retried 3 failed emails — all delivered',
  'sent a fee reminder to 412 parents', 'saved a draft newsletter', 'delivered 98% of a 530-contact campaign', 'added 35 contacts with mobile numbers'
];
const FEED = NAMES.map((n, i) => `${n[0]} from ${n[1]} ${TICKS[i]}`);

function LiveTable() {
  const rows = [['asha@acme.in', 'Asha Rao'], ['ravi@startup.io', 'Ravi Kumar'], ['meera@shop.com', 'Meera Nair'], ['karan@firm.co', 'Karan Shah'], ['divya@mail.in', 'Divya S.']];
  const [n, setN] = useState(0);
  useEffect(() => { const id = setInterval(() => setN(x => (x + 1) % (rows.length + 3)), 900); return () => clearInterval(id); }, []);
  const state = i => (n > i + 1 ? 'sent' : n === i + 1 ? 'sending' : 'queued');
  const done = Math.min(rows.length, Math.max(0, n - 1));
  return <div className="live-card" aria-hidden="true">
    <div className="live-head"><span className="live-dot" /> Campaign · Diwali offer <em>{done}/{rows.length} delivered</em></div>
    <div className="live-bar"><i style={{ width: `${done / rows.length * 100}%` }} /></div>
    {rows.map((r, i) => <div className={`live-row ${state(i)}`} key={r[0]}><span className="av">{r[1][0]}</span><div><b>{r[1]}</b><small>{r[0]}</small></div><span className="pill">{state(i) === 'sent' ? 'Delivered' : state(i) === 'sending' ? 'Sending…' : 'Queued'}</span></div>)}
  </div>;
}

const PLANS = [
  { id: 'free', name: 'Free', price: 0, daily: '300', tag: 'For trying things out', feats: ['300 emails / day', 'Excel & CSV import', 'Mobile numbers on contacts', 'Live delivery report', 'Drafts and retry'] },
  { id: 'starter', name: 'Starter', price: 499, daily: '1,000', tag: 'Most popular', feats: ['1,000 emails / day', 'Everything in Free', 'Sign emails with your name', 'Priority retry queue', 'Email support'], hot: true },
  { id: 'business', name: 'Business', price: 1499, daily: '5,000', tag: 'For busy teams', feats: ['5,000 emails / day', 'Everything in Starter', 'Multiple sender profiles', 'Dedicated onboarding', 'Phone support'] }
];
const FAQ = [
  ['Do I need a Gmail account to send?', 'You connect any SMTP mailbox in the server settings — a Gmail address with an App Password is the quickest way to start.'],
  ['How do I email everyone in my spreadsheet?', 'Open the Campaign studio, drop in an .xlsx or .csv with an email column (and optional name and mobile), write your message and press launch.'],
  ['Can I delete a campaign or a draft?', 'Yes — every campaign, draft and contact has a delete button. Campaigns that are still sending are protected until they finish.'],
  ['Does it send SMS?', 'Not yet. Mobile numbers are stored on your contacts and can be merged into messages with {{mobile}}; SMS is on the roadmap.']
];

export default function Landing() {
  const { admin } = useApp();
  const { hash } = useLocation();
  const [yearly, setYearly] = useState(false);
  const [open, setOpen] = useState(-1);
  const [menu, setMenu] = useState(false);
  const [stuck, setStuck] = useState(false);
  useEffect(() => { const f = () => setStuck(window.scrollY > 8); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  useEffect(() => { if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }), 80); }, [hash]);
  const price = p => (p.price === 0 ? '₹0' : '₹' + Math.round(yearly ? p.price * .8 : p.price).toLocaleString('en-IN'));
  const go = () => setMenu(false);

  return <div className="site">
    <header className={`s-nav ${stuck ? 'stuck' : ''}`}>
      <div className="s-wrap s-nav-in">
        <Link to="/" className="s-brand"><Brand /></Link>
        <nav className={menu ? 'open' : ''}>
          <a href="#features" onClick={go}>Features</a><a href="#how" onClick={go}>How it works</a><a href="#pricing" onClick={go}>Pricing</a><a href="#faq" onClick={go}>FAQ</a>
          <div className="s-nav-cta-m">{admin ? <Link to="/app" className="s-btn dark">Open dashboard</Link> : <><Link to="/login" className="s-btn ghost">Log in</Link><Link to="/signup" className="s-btn dark">Sign up free</Link></>}</div>
        </nav>
        <div className="s-nav-cta">{admin ? <Link to="/app" className="s-btn dark">Open dashboard <ArrowRight size={15} /></Link> : <><Link to="/login" className="s-btn ghost">Log in</Link><Link to="/signup" className="s-btn dark">Sign up free</Link></>}</div>
        <button className="s-burger" aria-label="Menu" onClick={() => setMenu(m => !m)}>{menu ? <X /> : <Menu />}</button>
      </div>
    </header>

    <section className="s-hero">
      <i className="blob b1" /><i className="blob b2" />
      <div className="s-wrap hero-grid">
        <div className="hero-copy">
          <span className="chip"><Sparkles size={14} /> New · Excel-to-inbox in one click</span>
          <h1>Email everyone in your sheet.<br /><span className="hl">In minutes, not hours.</span></h1>
          <p>Upload an Excel file, write one message, and PulsePost delivers it to every address — one by one, with live status, retries and a full history.</p>
          <div className="hero-cta"><Link to="/signup" className="s-btn big green">Start free <ArrowRight size={17} /></Link><a href="#how" className="s-btn big outline">See how it works</a></div>
          <ul className="hero-ticks"><li><Check size={15} /> No credit card</li><li><Check size={15} /> 300 emails a day free</li><li><Check size={15} /> Delete anything, anytime</li></ul>
        </div>
        <div className="hero-art">
          <LiveTable />
          <div className="float-card f1"><FileSpreadsheet size={18} /><div><b>leads.xlsx</b><small>1,180 contacts imported</small></div></div>
          <div className="float-card f2"><Smartphone size={18} /><div><b>+91 98765 43210</b><small>mobile saved</small></div></div>
          <div className="float-card f3"><ShieldCheck size={18} /><div><b>Email confirmed</b><small>account protected</small></div></div>
        </div>
      </div>
    </section>

    <section className="s-ticker" aria-label="Live activity (sample feed)">
      <div className="tick-label"><span className="live-dot" /> LIVE<small>sample feed</small></div>
      <div className="tick-track"><div className="tick-move">{[...FEED, ...FEED].map((t, i) => <span key={i}><Send size={13} /> {t}</span>)}</div></div>
    </section>

    <section className="s-stats s-wrap">{[['10x', 'faster than sending by hand'], ['500', 'recipients per campaign'], ['3', 'columns: email, name, mobile'], ['100%', 'of sends tracked & retryable']].map((x, i) => <Reveal key={x[0]} delay={i * 80}><div className="stat"><b>{x[0]}</b><span>{x[1]}</span></div></Reveal>)}</section>

    <section id="how" className="s-sec s-wrap">
      <Reveal><h2>From spreadsheet to sent in 3 steps</h2><p className="sub">No templates to fight with. No copy-pasting 200 addresses.</p></Reveal>
      <div className="steps">{[[FileSpreadsheet, '1', 'Upload your sheet', 'Drop an .xlsx or .csv. We find the email, name and mobile columns for you.'], [Mail, '2', 'Write your message', 'Use {{name}} to personalise every email. Preview it before it goes out.'], [Zap, '3', 'Launch and watch', 'See each email turn from queued to delivered live. Retry failures in one click.']].map(([Ic, n, t, d], i) => <Reveal key={n} delay={i * 110}><div className="step-card"><span className="num">{n}</span><Ic size={22} /><h3>{t}</h3><p>{d}</p></div></Reveal>)}</div>
    </section>

    <section id="features" className="s-sec alt">
      <div className="s-wrap">
        <Reveal><h2>Everything a small team needs</h2><p className="sub">Powerful where it matters, quiet everywhere else.</p></Reveal>
        <div className="feat-grid">{[[Gauge, 'Live progress', 'Watch delivery happen in real time with per-recipient status.'], [Smartphone, 'Mobile numbers', 'Store phone numbers with a country picker and merge them with {{mobile}}.'], [ShieldCheck, 'Verified accounts', 'Email confirmation and hashed passwords keep your workspace yours.'], [Trash2, 'Full control', 'Delete campaigns, drafts and contacts whenever you like.'], [Mail, 'Drafts & history', 'Save work in progress; review every past send in detail.'], [Zap, 'Smart retries', 'Failed addresses can be retried without re-sending to everyone.']].map(([Ic, t, d], i) => <Reveal key={t} delay={(i % 3) * 90}><div className="feat"><span className="ico"><Ic size={20} /></span><h3>{t}</h3><p>{d}</p></div></Reveal>)}</div>
      </div>
    </section>

    <section id="pricing" className="s-sec s-wrap">
      <Reveal><h2>Simple plans that grow with you</h2><p className="sub">Start free. Upgrade when your lists do.</p>
        <div className="bill-toggle"><span className={!yearly ? 'on' : ''}>Monthly</span><button role="switch" aria-checked={yearly} aria-label="Bill yearly" className={`switch ${yearly ? 'on' : ''}`} onClick={() => setYearly(y => !y)}><i /></button><span className={yearly ? 'on' : ''}>Yearly <em>save 20%</em></span></div></Reveal>
      <div className="plans">{PLANS.map((p, i) => <Reveal key={p.id} delay={i * 100}><div className={`plan ${p.hot ? 'hot' : ''}`}>
        {p.hot && <span className="ribbon">Most popular</span>}
        <h3>{p.name}</h3><small>{p.tag}</small>
        <div className="price"><b>{price(p)}</b><span>{p.price ? '/ month' : 'forever'}</span></div>
        <Link to={`/signup?plan=${p.id}`} className={`s-btn ${p.hot ? 'green' : 'outline'} full`}>{p.price ? `Choose ${p.name}` : 'Start free'}</Link>
        <ul>{p.feats.map(f => <li key={f}><Check size={15} /> {f}</li>)}</ul></div></Reveal>)}</div>
      <p className="fine">Payments are not connected in this project build — every new account starts on Free.</p>
    </section>

    <section id="faq" className="s-sec alt"><div className="s-wrap narrow">
      <Reveal><h2>Questions, answered</h2></Reveal>
      {FAQ.map((f, i) => <div key={f[0]} className={`faq ${open === i ? 'open' : ''}`}><button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>{f[0]}<ChevronDown size={18} /></button><div className="faq-a"><p>{f[1]}</p></div></div>)}
    </div></section>

    <section className="s-cta"><div className="s-wrap"><h2>Ready to send your first campaign?</h2><p>Create a free account in under a minute.</p><Link to="/signup" className="s-btn big white">Sign up free <ArrowRight size={17} /></Link></div></section>

    <footer className="s-footer"><div className="s-wrap foot-grid">
      <div><Brand /><p>Bulk email, made calm. Upload, write, send — and see exactly what happened.</p></div>
      <div><h4>Product</h4><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#how">How it works</a></div>
      <div><h4>Account</h4><Link to="/login">Log in</Link><Link to="/signup">Sign up</Link><Link to="/verify">Confirm email</Link></div>
      <div><h4>Resources</h4><a href="#faq">FAQ</a><a href="https://nodemailer.com/usage/using-gmail/" target="_blank" rel="noreferrer">Gmail SMTP guide</a></div>
    </div><div className="s-wrap foot-bar"><span>© {new Date().getFullYear()} PulsePost · Bulk Mail App</span><span>Built with React, Express, MongoDB &amp; Nodemailer</span></div></footer>
  </div>;
}
