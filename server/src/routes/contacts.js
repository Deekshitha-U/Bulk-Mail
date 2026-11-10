import { safeRouter } from '../utils/safeRouter.js';
import Contact from '../models/Contact.js';
import { requireAuth } from '../middleware/auth.js';
import { cleanContact, emailPattern, isValidMobile } from '../utils/phone.js';

const router = safeRouter();
router.use(requireAuth);
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function validate(c) {
  if (!emailPattern.test(c.email)) return 'Enter a valid email address.';
  if (c.mobile && !isValidMobile(c.mobile)) return 'Mobile number must include the country code, e.g. +919876543210.';
  return null;
}

router.get('/', async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = { createdBy: req.admin._id };
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }, { mobile: rx }];
  }
  const contacts = await Contact.find(filter).sort({ createdAt: -1 }).limit(2000);
  res.json({ contacts });
});

router.post('/', async (req, res) => {
  const c = cleanContact(req.body);
  const problem = validate(c);
  if (problem) return res.status(400).json({ message: problem });
  try {
    const contact = await Contact.create({ ...c, createdBy: req.admin._id });
    res.status(201).json({ contact });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You already have a contact with that email.' });
    throw error;
  }
});

// Bulk import (spreadsheet/CSV). Existing emails are updated, bad rows are skipped and counted.
router.post('/bulk', async (req, res) => {
  const rows = Array.isArray(req.body.contacts) ? req.body.contacts.slice(0, 5000) : [];
  const seen = new Set();
  const ops = [];
  let skipped = 0;
  for (const row of rows) {
    const c = cleanContact(row);
    if (validate(c) || seen.has(c.email)) { skipped++; continue; }
    seen.add(c.email);
    const set = {};
    if (c.name) set.name = c.name;
    if (c.mobile) set.mobile = c.mobile;
    ops.push({
      updateOne: {
        filter: { createdBy: req.admin._id, email: c.email },
        update: { ...(Object.keys(set).length ? { $set: set } : {}), $setOnInsert: { createdBy: req.admin._id } }, // never the same path as $set (MongoDB rejects that)
        upsert: true,
      },
    });
  }
  if (!ops.length) return res.json({ added: 0, updated: 0, skipped });
  const result = await Contact.bulkWrite(ops, { ordered: false });
  res.json({ added: result.upsertedCount, updated: result.modifiedCount, skipped });
});

router.put('/:id', async (req, res) => {
  const c = cleanContact(req.body);
  const problem = validate(c);
  if (problem) return res.status(400).json({ message: problem });
  try {
    const contact = await Contact.findOneAndUpdate({ _id: req.params.id, createdBy: req.admin._id }, c, { new: true });
    if (!contact) return res.status(404).json({ message: 'Contact not found.' });
    res.json({ contact });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You already have a contact with that email.' });
    throw error;
  }
});

router.delete('/:id', async (req, res) => {
  const contact = await Contact.findOneAndDelete({ _id: req.params.id, createdBy: req.admin._id });
  if (!contact) return res.status(404).json({ message: 'Contact not found.' });
  res.json({ message: 'Contact deleted.' });
});

export default router;
