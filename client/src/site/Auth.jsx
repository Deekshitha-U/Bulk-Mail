import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Mail, MailCheck, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { Brand } from '../components/ui.jsx';
import { useApp } from '../store.jsx';

function Shell({ title, sub, children, foot }) {
  return <div className="auth">
    <div className="auth-left">
      <Link to="/" className="auth-brand"><Brand /></Link>
      <div className="auth-card"><h1>{title}</h1><p className="auth-sub">{sub}</p>{children}</div>
      <div className="auth-foot">{foot}</div>
    </div>
    <div className="auth-right" aria-hidden="true">
      <i className="blob b1" /><i className="blob b2" />
      <div className="auth-art">
        <div className="a-card c1"><MailCheck size={20} /><div><b>Delivered</b><small>asha@acme.in</small></div></div>
        <div className="a-card c2"><Sparkles size={20} /><div><b>240 emails sent</b><small>Diwali offer</small></div></div>
        <div className="a-card c3"><ShieldCheck size={20} /><div><b>Your data, your control</b><small>delete anytime</small></div></div>
        <h2>Spreadsheet in.<br />Inboxes out.</h2>
      </div>
    </div>
  </div>;
}

function Pass({ value, onChange, autoComplete, placeholder = 'Password' }) {
  const [show, setShow] = useState(false);
  return <div className="pass"><input className="text-input" type={show ? 'text' : 'password'} required minLength={8} autoComplete={autoComplete} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(s => !s)}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>;
}

export function Login() {
  const { admin, login, toast } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  if (admin) return <Navigate to="/app" replace />;
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { const { data } = await api.post('/auth/login', { email, password }); login(data); toast(`Welcome back${data.admin.firstName ? ', ' + data.admin.firstName : ''}!`, 'success'); nav('/app', { replace: true }); }
    catch (ex) {
      if (ex.response?.data?.code === 'unverified') { toast('Please confirm your email first.', 'info'); return nav('/verify', { state: { email } }); }
      const m = errMsg(ex, 'Unable to sign in.'); setErr(m); toast(m, 'error');
    } finally { setBusy(false); }
  }
  return <Shell title="Welcome back" sub="Log in to your PulsePost workspace." foot={<>New here? <Link to="/signup">Create a free account</Link></>}>
    <form onSubmit={submit} className="auth-form">
      <label>Email</label><input className="text-input" type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
      <label>Password</label><Pass value={password} onChange={setPassword} autoComplete="current-password" />
      {err && <div className="auth-err" role="alert">{err}</div>}
      <button className="s-btn big green full" disabled={busy}>{busy ? <><Loader2 size={16} className="spin" /> Signing in…</> : <>Log in <ArrowRight size={16} /></>}</button>
    </form>
  </Shell>;
}

export function Signup() {
  const { admin, login, toast } = useApp();
  const nav = useNavigate(); const [params] = useSearchParams();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  if (admin) return <Navigate to="/app" replace />;
  const strength = Math.min(4, (password.length >= 8) + /[A-Z]/.test(password) + /\d/.test(password) + /[^A-Za-z0-9]/.test(password));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const { data } = await api.post('/auth/register', { email, password });
      if (data.verified) { login(data); toast('Account created!', 'success'); return nav('/app', { replace: true }); }
      toast(data.emailSent ? 'Account created — check your inbox.' : 'Account created.', data.emailSent ? 'success' : 'info');
      nav('/verify', { state: { email: data.email, devLink: data.devLink, emailSent: data.emailSent } });
    } catch (ex) { const m = errMsg(ex, 'Could not create the account.'); setErr(m); toast(m, 'error'); }
    finally { setBusy(false); }
  }
  return <Shell title="Create your free account" sub={params.get('plan') && params.get('plan') !== 'free' ? `You picked ${params.get('plan')} — start on Free, upgrade any time.` : 'Send your first bulk email in minutes. No card needed.'} foot={<>Already have an account? <Link to="/login">Log in</Link></>}>
    <form onSubmit={submit} className="auth-form">
      <label>Work email</label><input className="text-input" type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
      <label>Password</label><Pass value={password} onChange={setPassword} autoComplete="new-password" placeholder="At least 8 characters" />
      <div className={`meter s${strength}`} aria-hidden="true"><i /><i /><i /><i /></div>
      {err && <div className="auth-err" role="alert">{err}</div>}
      <button className="s-btn big green full" disabled={busy}>{busy ? <><Loader2 size={16} className="spin" /> Creating…</> : <>Sign up free <ArrowRight size={16} /></>}</button>
      <small className="auth-fine">We will email a link to confirm your address. You will add your name right after you log in.</small>
    </form>
  </Shell>;
}

export function Verify() {
  const { login, toast } = useApp();
  const nav = useNavigate(); const { state } = useLocation(); const [params] = useSearchParams();
  const token = params.get('token');
  const [phase, setPhase] = useState(token ? 'checking' : 'wait'); // checking | ok | bad | wait
  const [msg, setMsg] = useState(''); const [cool, setCool] = useState(0);
  const [email, setEmail] = useState(state?.email || ''); const [devLink, setDevLink] = useState(state?.devLink || '');
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return; ran.current = true;
    api.post('/auth/verify', { token }).then(({ data }) => { setPhase('ok'); login(data); setTimeout(() => nav('/app', { replace: true }), 1500); })
      .catch(e => { setPhase('bad'); setMsg(errMsg(e, 'This link is not valid.')); });
  }, [token]); // eslint-disable-line
  useEffect(() => { if (cool <= 0) return; const t = setTimeout(() => setCool(c => c - 1), 1000); return () => clearTimeout(t); }, [cool]);

  async function resend() {
    if (!email) return toast('Enter your email address first.', 'error');
    try { const { data } = await api.post('/auth/resend', { email }); setDevLink(data.devLink || ''); setCool(30); setPhase('wait'); toast(data.message, 'success'); }
    catch (e) { toast(errMsg(e), 'error'); }
  }
  const foot = <><Link to="/login">Back to log in</Link></>;
  if (phase === 'checking') return <Shell title="Confirming your email…" sub="One moment." foot={foot}><div className="verify-box"><Loader2 size={34} className="spin" /></div></Shell>;
  if (phase === 'ok') return <Shell title="Email confirmed!" sub="Taking you to your dashboard…" foot={foot}><div className="verify-box ok"><svg viewBox="0 0 52 52" className="check-svg"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg></div></Shell>;
  if (phase === 'bad') return <Shell title="That link did not work" sub={msg} foot={foot}>
    <div className="auth-form"><label>Your email</label><input className="text-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
      <button className="s-btn big green full" onClick={resend}><RefreshCw size={16} /> Send a new link</button></div></Shell>;
  return <Shell title="Check your inbox" sub={email ? `We sent a confirmation link to ${email}. Click it to activate your account.` : 'Enter your email and we will send a fresh confirmation link.'} foot={foot}>
    <div className="verify-box"><div className="mail-anim"><Mail size={34} /><i /></div></div>
    {state?.emailSent === false && <div className="auth-err">The email could not be sent — check SMTP_USER / SMTP_PASS in server/.env. {devLink ? 'Use the shortcut below while developing.' : ''}</div>}
    {!email && <div className="auth-form"><input className="text-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></div>}
    <button className="s-btn big outline full" onClick={resend} disabled={cool > 0}><RefreshCw size={16} /> {cool > 0 ? `Resend in ${cool}s` : 'Resend email'}</button>
    {devLink && <a className="dev-link" href={devLink}><CheckCircle2 size={14} /> Development shortcut: confirm now</a>}
  </Shell>;
}
