import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { BookUser, Bell, FileText, Gauge, HelpCircle, Home as HomeIcon, Inbox, LifeBuoy, LogOut, Megaphone, Settings2, Sparkles, UserRound, Zap } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { Brand } from '../components/ui.jsx';
import { PhonePrompt } from '../components/Modals.jsx';
import LaunchOverlay from '../components/LaunchOverlay.jsx';
import Composer from '../pages/Composer.jsx';
import Contacts from '../pages/Contacts.jsx';
import Settings from '../pages/Settings.jsx';
import { CampaignDetail, History } from '../pages/History.jsx';
import { useApp } from '../store.jsx';
import { GettingReady, NameModal } from './Popups.jsx';
import { CampaignsHub, Drafts, Home } from './Pages.jsx';

const NAV = [
  { to: '/app', label: 'Home', icon: HomeIcon, end: true },
  { to: '/app/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/app/contacts', label: 'Contacts', icon: BookUser },
  { to: '/app/history', label: 'Sent campaigns', icon: Inbox },
  { to: '/app/drafts', label: 'Drafts', icon: FileText },
  { to: '/app/settings', label: 'Settings', icon: Settings2 }
];
const TITLES = { '/app': 'Home', '/app/campaigns': 'Campaigns', '/app/compose': 'Campaign studio', '/app/contacts': 'Contacts', '/app/history': 'Sent campaigns', '/app/drafts': 'Drafts', '/app/settings': 'Settings' };

function Popover({ open, onClose, className = '', children, anchorRef }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = e => { if (!ref.current?.contains(e.target) && !anchorRef?.current?.contains(e.target)) onClose(); };
    const key = e => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', off); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', key); };
  }, [open, onClose, anchorRef]);
  return open ? <div ref={ref} className={`pop ${className}`} role="dialog">{children}</div> : null;
}

export default function Dashboard() {
  const { admin, logout, setAdmin, toast } = useApp();
  const navigate = useNavigate(); const loc = useLocation();
  const [stats, setStats] = useState(null); const [campaigns, setCampaigns] = useState([]); const [drafts, setDrafts] = useState([]); const [contacts, setContacts] = useState([]);
  const [usage, setUsage] = useState(null); const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState(null); const [launched, setLaunched] = useState(null);
  const [historySearch, setHistorySearch] = useState(''); const [pendingDraft, setPendingDraft] = useState(null); const [preset, setPreset] = useState(null);
  const [boot, setBoot] = useState(() => { try { return sessionStorage.getItem('pulsepost_boot') === '1'; } catch { return false; } });
  const [phonePrompt, setPhonePrompt] = useState(false); const phoneAsked = useRef(false);
  const [menu, setMenu] = useState(null); // 'profile' | 'usage' | 'bell' | 'help'
  const [online, setOnline] = useState(null);
  const avatarRef = useRef(null); const usageRef = useRef(null); const bellRef = useRef(null); const helpRef = useRef(null);
  const close = useCallback(() => setMenu(null), []);

  const refresh = useCallback(async () => {
    const run = (p, set) => p.then(r => set(r.data)).catch(err => { if (err.response?.status !== 401) console.warn(errMsg(err)); });
    await Promise.all([
      run(api.get('/dashboard'), d => setStats(d)),
      run(api.get('/campaigns'), d => setCampaigns(d.campaigns || [])),
      run(api.get('/drafts'), d => setDrafts(d.drafts || [])),
      run(api.get('/contacts'), d => setContacts(d.contacts || [])),
      run(api.get('/dashboard/usage'), d => setUsage(d.usage))
    ]);
    setLoaded(true);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    let live = true;
    const ping = () => api.get('/health', { timeout: 6000 }).then(() => live && setOnline(true)).catch(() => live && setOnline(false));
    ping(); const id = setInterval(ping, 20000); return () => { live = false; clearInterval(id); };
  }, []);
  useEffect(() => { setMenu(null); setSelected(null); window.scrollTo(0, 0); }, [loc.pathname]);

  const finishBoot = () => { try { sessionStorage.removeItem('pulsepost_boot'); } catch {} setBoot(false); };
  // After the loader: name pop-up first (new accounts), then the phone-number prompt.
  useEffect(() => {
    if (boot || admin.onboarded === false || admin.mobile || phoneAsked.current) return;
    let skipped = false; try { skipped = sessionStorage.getItem('pulsepost_phone_skip') === '1'; } catch {}
    if (skipped) { phoneAsked.current = true; return; }
    const t = setTimeout(() => { phoneAsked.current = true; setPhonePrompt(true); }, 900); return () => clearTimeout(t);
  }, [boot, admin.onboarded, admin.mobile]);

  const initial = (admin.firstName || admin.name || '?')[0].toUpperCase();
  const pct = usage ? Math.min(100, Math.round(usage.used / usage.daily * 100)) : 0;
  const title = loc.pathname.startsWith('/app/compose') ? 'Campaign studio' : TITLES[loc.pathname.replace(/\/$/, '')] || 'Home';
  const toggle = k => setMenu(m => (m === k ? null : k));
  const deleteCampaign = async c => { try { await api.delete('/campaigns/' + c._id); toast('Campaign deleted.', 'info'); refresh(); } catch (e) { toast(errMsg(e), 'error'); } };
  const deleteDraft = async id => { try { await api.delete('/drafts/' + id); toast('Draft deleted.', 'info'); refresh(); } catch (e) { toast(errMsg(e), 'error'); } };

  return <div className="dash-shell">
    <nav className="rail" aria-label="Main">
      <button className="rail-logo" data-tip="PulsePost" onClick={() => navigate('/')} aria-label="Public home page"><Brand compact /></button>
      <div className="rail-links">{NAV.map(n => <NavLink key={n.to} to={n.to} end={n.end} data-tip={n.label} aria-label={n.label} className={({ isActive }) => `rail-link ${isActive || (n.to === '/app/campaigns' && loc.pathname.startsWith('/app/compose')) ? 'active' : ''}`}><n.icon size={20} /></NavLink>)}</div>
      <div className="rail-bottom">
        <button ref={helpRef} className="rail-link" data-tip="Help" aria-label="Help" onClick={() => toggle('help')}><HelpCircle size={20} /></button>
        <button ref={avatarRef} className={`rail-avatar ${menu === 'profile' ? 'open' : ''}`} data-tip={menu === 'profile' ? undefined : admin.name} aria-label="Account menu" aria-haspopup="menu" aria-expanded={menu === 'profile'} onClick={() => toggle('profile')}>{initial}</button>
      </div>
      <Popover open={menu === 'profile'} onClose={close} anchorRef={avatarRef} className="pop-profile">
        <div className="pp-who"><span className="rail-avatar big">{initial}</span><div><b>{admin.name}</b><small>{admin.email}</small></div></div>
        <button className="pop-item" onClick={() => navigate('/app/settings')}><UserRound size={16} /> My profile</button>
        <button className="pop-item" onClick={() => navigate('/app/settings')}><Settings2 size={16} /> Settings</button>
        <button className="pop-item" onClick={() => { navigate('/'); }}><Sparkles size={16} /> Plans & pricing</button>
        <div className="pop-sep" />
        <button className="pop-item danger" onClick={() => { logout(); navigate('/', { replace: true }); toast('You have been logged out.', 'info'); }}><LogOut size={16} /> Log out</button>
      </Popover>
      <Popover open={menu === 'help'} onClose={close} anchorRef={helpRef} className="pop-help">
        <b className="pop-title">Quick help</b>
        <p>1. Open <b>Campaign studio</b>.<br />2. Upload an .xlsx / .csv with an <b>email</b> column (name & mobile optional).<br />3. Write your message — use <code>{'{{name}}'}</code> — and launch.</p>
        <button className="pop-item" onClick={() => navigate('/app/compose')}><LifeBuoy size={16} /> Open Campaign studio</button>
      </Popover>
    </nav>

    <div className="dash-main">
      <header className="dash-top">
        <h1 className="dash-title">{title}</h1>
        <div className="dash-top-r">
          <span className={`api-dot ${online === false ? 'down' : ''}`} title={online === false ? 'API offline' : 'API online'}><i />{online === null ? 'Checking' : online ? 'API online' : 'API offline'}</span>
          <button ref={usageRef} className="usage-btn" onClick={() => { toggle('usage'); refresh(); }} aria-expanded={menu === 'usage'}><Gauge size={15} /> Usage and plan</button>
          <button ref={bellRef} className="bell" aria-label="Notifications" onClick={() => toggle('bell')}><Bell size={18} />{campaigns.some(c => c.status === 'failed') && <i />}</button>
          <Popover open={menu === 'usage'} onClose={close} anchorRef={usageRef} className="pop-usage">
            <div className="usage-head"><b>Usage and plan</b><span className="plan-badge">{usage?.planLabel || 'Free'}</span></div>
            <p className="muted">Emails sent today</p>
            <div className="usage-num"><b>{usage?.used ?? 0}</b><span>/ {usage?.daily ?? 300}</span></div>
            <div className="usage-bar"><i style={{ width: `${pct}%` }} className={pct > 85 ? 'hot' : ''} /></div>
            <small className="muted">{usage ? `${usage.remaining} left today · resets at midnight UTC` : 'Loading…'}</small>
            <button className="primary-btn wide" onClick={() => navigate('/#pricing')}><Zap size={15} /> Upgrade plan</button>
          </Popover>
          <Popover open={menu === 'bell'} onClose={close} anchorRef={bellRef} className="pop-bell">
            <b className="pop-title">Notifications</b>
            {campaigns.length === 0 ? <p className="muted">Nothing yet. Send a campaign and its result will show up here.</p>
              : campaigns.slice(0, 4).map(c => <button key={c._id} className="pop-item note" onClick={() => { setMenu(null); setSelected(c); }}><i className={`d ${c.status}`} /><span><b>{c.subject}</b><small>{c.status === 'sent' ? 'Delivered to everyone' : c.status === 'sending' ? 'Sending now…' : c.status === 'failed' ? 'All emails failed — open to retry' : 'Some emails failed'} · {c.sentCount}/{c.totalRecipients}</small></span></button>)}
          </Popover>
        </div>
      </header>

      <main className="dash-page" key={loc.pathname}>
        <Routes>
          <Route index element={<Home stats={stats} campaigns={campaigns} admin={admin} contacts={contacts} onOpen={setSelected} onPhone={() => setPhonePrompt(true)} />} />
          <Route path="campaigns" element={<CampaignsHub campaigns={campaigns} drafts={drafts} />} />
          <Route path="compose" element={<Composer drafts={drafts} draftToLoad={pendingDraft} contacts={contacts} preset={preset} onPresetUsed={() => setPreset(null)} toast={toast}
            onLaunched={c => { setLaunched(c); refresh(); }} onDraft={async payload => { try { await api.post('/drafts', payload); await refresh(); toast('Draft saved.', 'success'); } catch (e) { toast(errMsg(e), 'error'); } }} />} />
          <Route path="contacts" element={<Contacts contacts={contacts} loading={!loaded} reload={refresh} toast={toast} onUse={list => { setPreset(list); navigate('/app/compose'); }} />} />
          <Route path="history" element={<History campaigns={campaigns} loading={!loaded} search={historySearch} setSearch={setHistorySearch} onOpen={setSelected} onDelete={deleteCampaign} />} />
          <Route path="drafts" element={<Drafts drafts={drafts} loading={!loaded} onLoad={d => { setPendingDraft(d); navigate('/app/compose'); }} onDelete={deleteDraft} />} />
          <Route path="settings" element={<Settings admin={admin} onAdmin={setAdmin} toast={toast} />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </main>
    </div>

    <AnimatePresence>{selected && <CampaignDetail key={selected._id} campaign={selected} onClose={() => setSelected(null)} onChanged={refresh} toast={toast} />}</AnimatePresence>
    <AnimatePresence>{launched && <LaunchOverlay key={launched._id} campaign={launched} toast={toast} onChanged={refresh}
      onClose={() => { setLaunched(null); navigate('/app/history'); refresh(); }} onViewReport={c => { setLaunched(null); navigate('/app/history'); setSelected(c); }} />}</AnimatePresence>
    <AnimatePresence>{!boot && admin.onboarded === false && <NameModal key="name" admin={admin} toast={toast} onSaved={a => setAdmin(a)} />}</AnimatePresence>
    <AnimatePresence>{phonePrompt && <PhonePrompt key="phone" toast={toast} onSaved={a => { setAdmin(a); setPhonePrompt(false); }} onSkip={() => { try { sessionStorage.setItem('pulsepost_phone_skip', '1'); } catch {} setPhonePrompt(false); }} />}</AnimatePresence>
    {boot && <GettingReady onDone={finishBoot} />}
  </div>;
}
