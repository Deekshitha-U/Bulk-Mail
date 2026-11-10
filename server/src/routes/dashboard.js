import { safeRouter } from '../utils/safeRouter.js';
import Campaign from '../models/Campaign.js';
import Contact from '../models/Contact.js';
import { usageFor } from '../utils/usage.js';
import { requireAuth } from '../middleware/auth.js';
const router = safeRouter();
router.use(requireAuth);

router.get('/usage', async (req, res) => res.json({ usage: await usageFor(req.admin) }));

router.get('/', async (req, res) => {
  const owner = req.admin._id;
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 6);

  const [totalsAgg, recent, dailyAgg, contacts] = await Promise.all([
    Campaign.aggregate([
      { $match: { createdBy: owner } },
      { $group: { _id: null, campaigns: { $sum: 1 }, recipients: { $sum: '$totalRecipients' }, sent: { $sum: '$sentCount' }, failed: { $sum: '$failedCount' } } }
    ]),
    Campaign.find({ createdBy: owner }).sort({ createdAt: -1 }).limit(5).select('subject totalRecipients sentCount failedCount status createdAt'),
    Campaign.aggregate([
      { $match: { createdBy: owner, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sent: { $sum: '$sentCount' }, failed: { $sum: '$failedCount' } } }
    ]),
    Contact.countDocuments({ createdBy: owner })
  ]);

  const t = totalsAgg[0] || { campaigns: 0, recipients: 0, sent: 0, failed: 0 };
  const byDay = Object.fromEntries(dailyAgg.map(d => [d._id, d]));
  const daily = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, sent: byDay[key]?.sent || 0, failed: byDay[key]?.failed || 0 };
  });
  res.json({ totalCampaigns: t.campaigns, recipients: t.recipients, sent: t.sent, failed: t.failed, contacts, recent, daily });
});
export default router;
