export const PLANS = {
  free: { label: 'Free', daily: 300 },
  starter: { label: 'Starter', daily: 1000 },
  business: { label: 'Business', daily: 5000 }
};
export const planOf = a => PLANS[a?.plan] || PLANS.free;
