import { Link } from 'react-router-dom';
import { ArrowRight, BookUser, Check, FileSpreadsheet, FileText, Mail, MessageSquare, Phone, Send, Trash2, Workflow } from 'lucide-react';
import { prettyDate } from '../lib/contacts.js';
import { DeleteButton, EmptyState, PageHeading } from '../components/ui.jsx';
import Overview from '../pages/Overview.jsx';

export function Home({ stats, campaigns, admin, contacts, usageDone, onOpen, onPhone }) {
  const tasks = [
    ['Create your account', true, null],
    ['Confirm your email', admin.verified !== false, null],
    ['Add your name', !!admin.firstName, '/app/settings'],
    ['Add a phone number', !!admin.mobile, null, onPhone],
    ['Import your contacts', contacts.length > 0, '/app/contacts'],
    ['Send your first campaign', campaigns.length > 0, '/app/compose']
  ];
  const done = tasks.filter(t => t[1]).length;
  const R = 22, C = 2 * Math.PI * R;
  return <>
    <PageHeading title={`Hello, ${admin.firstName || admin.name}`} description="Here is what is happening with your campaigns." action={<Link className="primary-btn" to="/app/compose"><Send size={15} /> New campaign</Link>} />
    {done < tasks.length && admin.prefs?.tips !== false && <section className="panel checklist">
      <div className="cl-head"><svg width="54" height="54" viewBox="0 0 54 54"><circle cx="27" cy="27" r={R} className="trk" /><circle cx="27" cy="27" r={R} className="val" strokeDasharray={C} strokeDashoffset={C * (1 - done / tasks.length)} /></svg><div><h3>Get started with PulsePost</h3><p>{done} of {tasks.length} steps done</p></div></div>
      <ul>{tasks.map(([t, ok, to, fn]) => <li key={t} className={ok ? 'ok' : ''}><span className="tick">{ok && <Check size={13} />}</span><span>{t}</span>{!ok && (to ? <Link to={to}>Do it <ArrowRight size={13} /></Link> : fn ? <button onClick={fn}>Do it <ArrowRight size={13} /></button> : null)}</li>)}</ul>
    </section>}
    <Overview stats={stats} campaigns={campaigns} admin={admin} onNav={() => {}} onOpen={onOpen} embedded />
  </>;
}

export function CampaignsHub({ campaigns, drafts }) {
  const cards = [
    { icon: Mail, title: 'Email campaign', text: 'Write one message and send it to everyone in a list or spreadsheet.', to: '/app/compose', cta: 'Create campaign', on: true },
    { icon: FileSpreadsheet, title: 'Import from Excel', text: 'Upload an .xlsx or .csv and email every address in it.', to: '/app/compose', cta: 'Upload & send', on: true },
    { icon: MessageSquare, title: 'SMS campaign', text: 'Reach contacts on their mobile number.', cta: 'Coming soon' },
    { icon: Workflow, title: 'Automations', text: 'Trigger emails from sign-ups and events.', cta: 'Coming soon' }
  ];
  return <>
    <PageHeading title="Campaigns" description="Create, send and review everything you have sent." />
    <div className="hub-grid">{cards.map(c => <div key={c.title} className={`hub-card ${c.on ? '' : 'soon'}`}><span className="ico"><c.icon size={22} /></span><h3>{c.title}</h3><p>{c.text}</p>
      {c.on ? <Link className="primary-btn" to={c.to}>{c.cta} <ArrowRight size={14} /></Link> : <span className="badge-soon">{c.cta}</span>}</div>)}</div>
    <div className="hub-links"><Link to="/app/history"><Mail size={16} /> Sent campaigns <b>{campaigns.length}</b><ArrowRight size={14} /></Link><Link to="/app/drafts"><FileText size={16} /> Drafts <b>{drafts.length}</b><ArrowRight size={14} /></Link><Link to="/app/contacts"><BookUser size={16} /> Contacts <ArrowRight size={14} /></Link></div>
  </>;
}

export function Drafts({ drafts, loading, onLoad, onDelete }) {
  return <>
    <PageHeading title="Drafts" description="Unfinished campaigns, saved from the Campaign studio." action={<Link className="primary-btn" to="/app/compose">New campaign</Link>} />
    {loading ? <div className="panel pad"><div className="skeleton sk-row" /><div className="skeleton sk-row" /></div>
      : drafts.length === 0 ? <div className="panel"><EmptyState icon={FileText} title="No drafts yet" text="Press “Save draft” in the Campaign studio and your work will be waiting here." action={() => {}} actionLabel="" /></div>
        : <div className="draft-grid">{drafts.map(d => <div key={d._id} className="draft-card">
          <div className="draft-card-top"><span className="draft-icon"><FileText size={18} /></span><DeleteButton title="Delete draft" onConfirm={() => onDelete(d._id)} /></div>
          <h3>{d.subject || 'Untitled draft'}</h3><p>{d.body || 'No message content yet.'}</p>
          <div className="draft-card-foot"><span>{(d.contacts?.length || d.recipients?.length || 0)} recipients · {prettyDate(d.updatedAt)}</span><button className="text-btn" onClick={() => onLoad(d)}>Continue <ArrowRight size={14} /></button></div></div>)}</div>}
  </>;
}
