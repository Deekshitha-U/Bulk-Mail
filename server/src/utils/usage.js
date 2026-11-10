import Campaign from '../models/Campaign.js';
import { planOf } from './plans.js';
export async function usageFor(admin) {
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const agg = await Campaign.aggregate([
    { $match: { createdBy: admin._id, createdAt: { $gte: since } } },
    { $group: { _id: null, used: { $sum: '$totalRecipients' } } }
  ]);
  const used = agg[0]?.used || 0;
  const p = planOf(admin);
  return { plan: admin.plan || 'free', planLabel: p.label, daily: p.daily, used, remaining: Math.max(0, p.daily - used) };
}
