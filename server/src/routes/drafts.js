import { safeRouter } from '../utils/safeRouter.js';
import Draft from '../models/Draft.js';
import { requireAuth } from '../middleware/auth.js';
import { cleanContact } from '../utils/phone.js';
const router = safeRouter();
router.use(requireAuth);
router.get('/', async (req, res) => res.json({ drafts: await Draft.find({ createdBy: req.admin._id }).sort({ updatedAt: -1 }) }));
router.post('/', async (req, res) => {
  const { subject = '', body = '', recipients = [], contacts = [] } = req.body;
  const list = (Array.isArray(contacts) && contacts.length ? contacts : Array.isArray(recipients) ? recipients : [])
    .slice(0, 500).map(cleanContact).filter(c => c.email);
  const draft = await Draft.create({
    subject: String(subject).slice(0, 180), body: String(body).slice(0, 20000),
    recipients: list.map(c => c.email), contacts: list, createdBy: req.admin._id
  });
  res.status(201).json({ draft });
});
router.delete('/:id', async (req, res) => {
  const draft = await Draft.findOneAndDelete({ _id: req.params.id, createdBy: req.admin._id });
  if (!draft) return res.status(404).json({ message: 'Draft not found.' });
  res.json({ message: 'Draft deleted.' });
});
export default router;
