import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, BookUser, CheckCircle2, Mail, Plus, Send, Smartphone, Sparkles, Users } from 'lucide-react';
import { prettyDate } from '../lib/contacts.js';
import { CountUp, EmptyState, PageHeading, StatCard, Status } from '../components/ui.jsx';

const R = 54, C = 2 * Math.PI * R;

function DailyChart({ daily }) {
  const max = Math.max(1, ...daily.map(d => d.sent + d.failed));
  return <div className="bars" role="img" aria-label="Emails per day over the last 7 days">
    {daily.map((d, i) => {
      const day = new Date(d.date + 'T00:00:00');
      const h = ((d.sent + d.failed) / max) * 100;
      return <div className="bar-col" key={d.date} title={`${d.sent} accepted, ${d.failed} failed`}>
        <div className="bar-track">
          <motion.div className="bar-fill" initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: .2 + i * .06, type: 'spring', stiffness: 120, damping: 18 }}>
            {d.failed > 0 && <i style={{ height: `${(d.failed / (d.sent + d.failed)) * 100}%` }} />}
          </motion.div>
        </div>
        <small>{day.toLocaleDateString([], { weekday: 'short' }).slice(0, 3)}</small>
      </div>;
    })}
  </div>;
}

export default function Overview({ stats, campaigns, admin, onOpen, embedded }) {
  const navigate = useNavigate();
  const onNav = id => navigate(id === 'overview' ? '/app' : '/app/' + id);
  const rate = stats?.recipients ? Math.round((stats.sent / stats.recipients) * 100) : 0;
  const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: '2-digit' }).toUpperCase();
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const loading = !stats;
  return <>
    {!embedded && <PageHeading title={`${hello}, ${admin.firstName || admin.name}`} description="Your outreach at a glance." />}
    <div className="stats-grid">
      <StatCard index={0} loading={loading} label="CAMPAIGNS SENT" value={stats?.totalCampaigns} sub="All-time campaigns" icon={Send} accent="violet" />
      <StatCard index={1} loading={loading} label="TOTAL RECIPIENTS" value={stats?.recipients} sub="Unique delivery attempts" icon={Users} accent="blue" />
      <StatCard index={2} loading={loading} label="ACCEPTED BY SMTP" value={stats?.sent} sub="Provider accepted" icon={CheckCircle2} accent="green" />
      <StatCard index={3} loading={loading} label="DELIVERY ISSUES" value={stats?.failed} sub="Needs a second look" icon={Activity} accent="orange" />
      <StatCard index={4} loading={loading} label="SAVED CONTACTS" value={stats?.contacts} sub="In your address book" icon={BookUser} accent="violet" />
    </div>

    
    <div className="overview-grid">
      <section className="panel recent-panel">
        <div className="panel-head"><div><div className="eyebrow">LATEST ACTIVITY</div><h3>Recent campaigns</h3></div><button className="text-btn" onClick={() => onNav('compose')}>Create new <ArrowRight size={14} /></button></div>
        {campaigns.length === 0 ? <EmptyState icon={Mail} title="Your outbox is quiet" text="Your first campaign will appear here once it has been sent." action={() => onNav('compose')} />
          : <div className="campaign-list">{campaigns.slice(0, 5).map((c, i) => <motion.button className="campaign-row" key={c._id} onClick={() => onOpen(c)} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .1 + i * .06 }}>
            <div className="campaign-symbol"><Mail size={17} /></div>
            <div className="campaign-info"><b>{c.subject}</b><small>{prettyDate(c.createdAt)} · {c.totalRecipients} recipients</small></div>
            <Status status={c.status} /><ArrowRight className="row-arrow" size={16} /></motion.button>)}</div>}
      </section>

      <section className="panel pulse-panel">
        <div className="eyebrow">DELIVERY PULSE</div><h3>Provider acceptance</h3>
        <div className="pulse-ring">
          <svg viewBox="0 0 130 130"><circle cx="65" cy="65" r={R} className="ring-bg" />
            <motion.circle cx="65" cy="65" r={R} className="ring-fg" strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C - (C * rate) / 100 }} transition={{ duration: 1.1, ease: 'easeOut', delay: .25 }} /></svg>
          <div className="pulse-number"><CountUp value={rate} /><span>%</span></div>
        </div>
        <div className="pulse-legend"><span><i className="legend-dot green-dot" /> Accepted <b>{stats?.sent ?? 0}</b></span><span><i className="legend-dot orange-dot" /> Failed <b>{stats?.failed ?? 0}</b></span></div>
        <div className="eyebrow chart-title">LAST 7 DAYS</div>
        {stats?.daily ? <DailyChart daily={stats.daily} /> : <div className="skeleton sk-chart" />}
        <div className="pulse-note"><Sparkles size={15} /> A successful SMTP handoff is not a guarantee of inbox placement.</div>
      </section>
    </div>
    <div className="bottom-note"><div className="note-mark"><Activity size={17} /></div><div><b>Thoughtful outreach starts with permission.</b><span>Send only to opted-in recipients and make it easy to unsubscribe.</span></div><span className="note-tag">RESPONSIBLE SENDING</span></div>
  </>;
}
