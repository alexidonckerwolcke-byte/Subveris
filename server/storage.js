import crypto from 'crypto';

function getMonthKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}`;
}

export class MemStorage {
  constructor() {
    this.subscriptions = new Map();
  }

  async createSubscription(data) {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const now = new Date().toISOString();
    const record = {
      id,
      userId: data.userId,
      name: data.name,
      category: data.category,
      amount: data.amount,
      frequency: data.frequency,
      nextBillingDate: data.nextBillingDate,
      usageCount: 0,
      // monthlyUsageCount intentionally left undefined until used
      createdAt: now,
    };
    this.subscriptions.set(id, record);
    return { ...record };
  }

  async recordSubscriptionUsage(id, timeZone = 'UTC', now = new Date()) {
    const rec = this.subscriptions.get(id);
    if (!rec) return null;
    const ym = getMonthKey(now, timeZone);
    // reset monthly count if month changed
    if (rec.usageMonth !== ym) {
      rec.monthlyUsageCount = 0;
      rec.usageMonth = ym;
    }
    rec.usageCount = (rec.usageCount || 0) + 1;
    rec.monthlyUsageCount = (rec.monthlyUsageCount || 0) + 1;
    rec.lastUsedAt = now.toISOString();
    this.subscriptions.set(id, rec);
    return { ...rec };
  }

  async updateSubscriptionUsage(id, newCount, timeZone = 'UTC', now = new Date()) {
    const rec = this.subscriptions.get(id);
    if (!rec) return null;
    const ym = getMonthKey(now, timeZone);
    rec.usageCount = newCount;
    rec.monthlyUsageCount = newCount;
    rec.usageMonth = ym;
    rec.lastUsedAt = now.toISOString();
    this.subscriptions.set(id, rec);
    return { ...rec };
  }
}
