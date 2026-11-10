import { safeRouter } from '../utils/safeRouter.js';
import Campaign from '../models/Campaign.js';
import { usageFor } from '../utils/usage.js';
import { requireAuth } from '../middleware/auth.js';
import { getTransporter } from '../utils/mailer.js';
import { cleanContact, emailPattern, isValidMobile, personalize } from '../utils/phone.js';

const router = safeRouter();
router.use(requireAuth);
const SEND_DELAY_MS = Number(process.env.SEND_DELAY_MS || 150);
const sigOf = a => (a.prefs?.signature ? a.name : '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* Runs after the HTTP response has been sent. The browser polls GET /campaigns/:id for live progress. */
async function deliver(campaignId, transporter, signature = '') {
  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return;
    const queue = campaign.recipients.filter(r => r.status === 'pending');
    let authFailure = null; // once the SMTP login is rejected, every further attempt would fail the same way
    for (const r of queue) {
      const contact = { email: r.email, name: r.name, mobile: r.mobile };
      if (authFailure) {
        await Campaign.updateOne({ _id: campaignId, 'recipients.email': r.email }, {
          $set: { 'recipients.$.status': 'failed', 'recipients.$.error': authFailure }, $inc: { failedCount: 1 }
        });
        continue;
      }
      try {
        const info = await transporter.sendMail({
          from: process.env.MAIL_FROM || process.env.SMTP_USER,
          to: r.email,
          subject: personalize(campaign.subject, contact),
          text: personalize(campaign.body, contact) + (signature ? `\n\n— ${signature}` : '')
        });
        await Campaign.updateOne({ _id: campaignId, 'recipients.email': r.email }, {
          $set: { 'recipients.$.status': 'sent', 'recipients.$.messageId': info.messageId, 'recipients.$.sentAt': new Date() },
          $inc: { sentCount: 1 }
        });
      } catch (error) {
        console.error(`Mail failed for ${r.email}:`, error.message);
        const message = error.code === 'EAUTH'
          ? `SMTP login rejected. Check SMTP_USER and SMTP_PASS (a 16-character Gmail App Password) in server/.env, restart the API, then press Retry. (${String(error.message).slice(0, 120)})`
          : String(error.message).slice(0, 500);
        if (error.code === 'EAUTH') authFailure = message;
        await Campaign.updateOne({ _id: campaignId, 'recipients.email': r.email }, {
          $set: { 'recipients.$.status': 'failed', 'recipients.$.error': message },
          $inc: { failedCount: 1 }
        });
      }
      await sleep(SEND_DELAY_MS);
    }
    const done = await Campaign.findById(campaignId);
    const status = done.sentCount === done.totalRecipients ? 'sent' : done.sentCount === 0 ? 'failed' : 'partial';
    await Campaign.updateOne({ _id: campaignId }, { $set: { status, finishedAt: new Date() } });
  } catch (error) {
    console.error('Campaign crashed:', error);
    await Campaign.updateOne({ _id: campaignId }, { $set: { status: 'partial', finishedAt: new Date() } }).catch(() => {});
  }
}

router.post('/send', async (req, res) => {
  const subject = String(req.body.subject || '').trim();
  const body = String(req.body.body || '').trim();
  const raw = Array.isArray(req.body.recipients) ? req.body.recipients : [];

  const byEmail = new Map();
  raw.map(cleanContact).filter(c => c.email).forEach(c => {
    const prev = byEmail.get(c.email);
    byEmail.set(c.email, prev ? { ...prev, name: prev.name || c.name, mobile: prev.mobile || c.mobile } : c);
  });
  const recipients = [...byEmail.values()];

  if (!subject || !body || recipients.length === 0) {
    return res.status(400).json({ message: 'Subject, message body, and at least one recipient are required.' });
  }
  if (subject.length > 180 || body.length > 20000 || recipients.length > 500) {
    return res.status(400).json({ message: 'Subject/body too long or recipient limit exceeded (500 per campaign).' });
  }
  const invalid = recipients.filter(c => !emailPattern.test(c.email)).map(c => c.email);
  if (invalid.length) return res.status(400).json({ message: 'Remove invalid email addresses before sending.', invalid });
  const badMobiles = recipients.filter(c => c.mobile && !isValidMobile(c.mobile)).map(c => `${c.email} (${c.mobile})`);
  if (badMobiles.length) return res.status(400).json({ message: 'Some mobile numbers are invalid. Use the country code, e.g. +919876543210.', invalid: badMobiles });

  const usage = await usageFor(req.admin);
  if (recipients.length > usage.remaining) {
    return res.status(403).json({ code: 'quota', message: `Daily limit reached: your ${usage.planLabel} plan allows ${usage.daily} emails a day and you have ${usage.remaining} left today.` });
  }
  let transporter;
  try { transporter = getTransporter(); }
  catch (error) { return res.status(503).json({ message: error.message }); }

  const campaign = await Campaign.create({
    subject, body, status: 'sending', totalRecipients: recipients.length,
    recipients: recipients.map(c => ({ ...c, status: 'pending' })),
    createdBy: req.admin._id
  });
  res.status(202).json({ message: 'Campaign launched.', campaign });
  deliver(campaign._id, transporter, sigOf(req.admin));
});

router.post('/:id/retry', async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.admin._id });
  if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
  if (campaign.status === 'sending') return res.status(409).json({ message: 'This campaign is still sending.' });
  const retryable = campaign.recipients.filter(r => r.status !== 'sent');
  if (!retryable.length) return res.status(400).json({ message: 'Nothing to retry — every recipient was accepted.' });
  let transporter;
  try { transporter = getTransporter(); }
  catch (error) { return res.status(503).json({ message: error.message }); }
  campaign.recipients.forEach(r => { if (r.status !== 'sent') { r.status = 'pending'; r.error = undefined; } });
  campaign.failedCount = 0;
  campaign.sentCount = campaign.recipients.filter(r => r.status === 'sent').length;
  campaign.status = 'sending';
  campaign.finishedAt = undefined;
  await campaign.save();
  res.status(202).json({ message: `Retrying ${retryable.length} recipient(s).`, campaign });
  deliver(campaign._id, transporter, sigOf(req.admin));
});

router.delete('/:id', async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.admin._id }).select('status');
  if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
  if (campaign.status === 'sending') return res.status(409).json({ message: 'This campaign is still sending. Wait for it to finish, then delete it.' });
  await campaign.deleteOne();
  res.json({ message: 'Campaign deleted.' });
});

router.get('/', async (req, res) => {
  const search = String(req.query.search || '').trim();
  const filter = { createdBy: req.admin._id };
  if (search) filter.subject = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const campaigns = await Campaign.find(filter).sort({ createdAt: -1 }).limit(100).select('-body -recipients');
  res.json({ campaigns });
});
router.get('/:id', async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, createdBy: req.admin._id });
  if (!campaign) return res.status(404).json({ message: 'Campaign not found.' });
  res.json({ campaign });
});
export default router;
