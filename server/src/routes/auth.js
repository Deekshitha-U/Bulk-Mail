import { safeRouter } from '../utils/safeRouter.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { requireAuth } from '../middleware/auth.js';
import { getTransporter } from '../utils/mailer.js';
import { normalizeMobile, isValidMobile, emailPattern } from '../utils/phone.js';

const router = safeRouter();
const requireVerification = () => String(process.env.REQUIRE_EMAIL_VERIFICATION ?? 'true').toLowerCase() !== 'false';
const isProd = () => process.env.NODE_ENV === 'production';
const publicAdmin = a => ({
  id: a._id, name: a.name, firstName: a.firstName || '', lastName: a.lastName || '', email: a.email, mobile: a.mobile || '',
  verified: a.verified !== false, onboarded: a.onboarded !== false, plan: a.plan || 'free',
  prefs: { tips: a.prefs?.tips !== false, signature: !!a.prefs?.signature }
});
const sign = a => jwt.sign({ id: a._id }, process.env.JWT_SECRET, { expiresIn: '12h' });
const clientBase = () => String(process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');

/* Creates a fresh token, emails the link. Returns { sent, devLink }. Never throws: sign-up must not fail because SMTP is down. */
async function issueVerification(admin) {
  const token = crypto.randomBytes(24).toString('hex');
  admin.verifyToken = crypto.createHash('sha256').update(token).digest('hex');
  admin.verifyExpires = new Date(Date.now() + 24 * 3600 * 1000);
  await admin.save();
  const link = `${clientBase()}/verify?token=${token}`;
  let sent = false;
  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER, to: admin.email, subject: 'Confirm your PulsePost email',
      text: `Hi ${admin.firstName || 'there'},\n\nConfirm your email to activate your PulsePost account:\n${link}\n\nThe link works for 24 hours. If you did not sign up, ignore this message.`
    });
    sent = true;
  } catch (e) { console.error('Verification email failed:', e.message); }
  return { sent, devLink: isProd() ? undefined : link };
}

router.post('/register', async (req, res) => {
  const firstName = String(req.body.firstName || '').trim().slice(0, 40);
  const lastName = String(req.body.lastName || '').trim().slice(0, 40);
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!emailPattern.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  const existing = await Admin.findOne({ email });
  if (existing) return res.status(409).json({ message: 'An account with this email already exists. Try signing in.' });
  const needsVerify = requireVerification();
  const admin = await Admin.create({
    email, password: await bcrypt.hash(password, 12), firstName, lastName,
    name: `${firstName} ${lastName}`.trim() || email.split('@')[0],
    verified: !needsVerify, onboarded: false
  });
  if (!needsVerify) return res.status(201).json({ verified: true, token: sign(admin), admin: publicAdmin(admin) });
  const { sent, devLink } = await issueVerification(admin);
  res.status(201).json({ verified: false, emailSent: sent, devLink, email, message: sent ? `We sent a confirmation link to ${email}.` : 'Account created, but the confirmation email could not be sent (check SMTP in server/.env).' });
});

router.post('/verify', async (req, res) => {
  const token = String(req.body.token || '');
  if (!token) return res.status(400).json({ message: 'Missing verification token.' });
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const admin = await Admin.findOne({ verifyToken: hash });
  if (!admin) return res.status(400).json({ message: 'This link is invalid or was already used.' });
  if (admin.verifyExpires && admin.verifyExpires < new Date()) return res.status(400).json({ message: 'This link has expired. Request a new one.', expired: true });
  admin.verified = true; admin.verifyToken = ''; admin.verifyExpires = undefined;
  await admin.save();
  res.json({ message: 'Email confirmed.', token: sign(admin), admin: publicAdmin(admin) });
});

router.post('/resend', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const admin = await Admin.findOne({ email });
  // Same answer whether or not the account exists, so this cannot be used to probe for emails.
  if (!admin || admin.verified !== false) return res.json({ message: 'If that account needs confirming, a new link is on its way.' });
  const { sent, devLink } = await issueVerification(admin);
  res.json({ emailSent: sent, devLink, message: 'If that account needs confirming, a new link is on its way.' });
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
  const admin = await Admin.findOne({ email });
  if (!admin || !(await bcrypt.compare(password, admin.password))) return res.status(401).json({ message: 'Incorrect email or password.' });
  if (admin.verified === false && requireVerification()) return res.status(403).json({ code: 'unverified', email, message: 'Please confirm your email first. Check your inbox for the link.' });
  res.json({ token: sign(admin), admin: publicAdmin(admin) });
});

router.get('/me', requireAuth, (req, res) => res.json({ admin: publicAdmin(req.admin) }));

// Update profile. Send mobile: "" to remove it.
router.put('/profile', requireAuth, async (req, res) => {
  const update = {};
  const a = req.admin;
  if (req.body.firstName !== undefined || req.body.lastName !== undefined) {
    const firstName = String(req.body.firstName ?? a.firstName ?? '').trim().slice(0, 40);
    const lastName = String(req.body.lastName ?? a.lastName ?? '').trim().slice(0, 40);
    if (!firstName) return res.status(400).json({ message: 'First name cannot be empty.' });
    Object.assign(update, { firstName, lastName, name: `${firstName} ${lastName}`.trim() });
  }
  if (req.body.name !== undefined && update.name === undefined) {
    const name = String(req.body.name).trim().slice(0, 80);
    if (!name) return res.status(400).json({ message: 'Name cannot be empty.' });
    update.name = name;
  }
  if (req.body.mobile !== undefined) {
    const mobile = normalizeMobile(req.body.mobile);
    if (mobile && !isValidMobile(mobile)) return res.status(400).json({ message: 'Enter the mobile number with its country code, e.g. +919876543210.' });
    update.mobile = mobile;
  }
  if (req.body.onboarded !== undefined) update.onboarded = !!req.body.onboarded;
  if (req.body.prefs && typeof req.body.prefs === 'object') {
    if (req.body.prefs.tips !== undefined) update['prefs.tips'] = !!req.body.prefs.tips;
    if (req.body.prefs.signature !== undefined) update['prefs.signature'] = !!req.body.prefs.signature;
  }
  const admin = await Admin.findByIdAndUpdate(a._id, { $set: update }, { new: true });
  res.json({ admin: publicAdmin(admin) });
});

router.put('/password', requireAuth, async (req, res) => {
  const current = String(req.body.current || '');
  const next = String(req.body.next || '');
  if (next.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  const admin = await Admin.findById(req.admin._id);
  if (!(await bcrypt.compare(current, admin.password))) return res.status(400).json({ message: 'Your current password is incorrect.' });
  admin.password = await bcrypt.hash(next, 12);
  await admin.save();
  res.json({ message: 'Password updated.' });
});

export default router;
