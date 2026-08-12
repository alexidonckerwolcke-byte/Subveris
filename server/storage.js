import crypto from 'crypto';

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

  async recordSubscriptionUsage(id) {
    const rec = this.subscriptions.get(id);
    if (!rec) return null;
    const now = new Date();
    const ym = now.toISOString().substr(0, 7);
    // reset monthly count if month changed
    if (rec.usageMonth !== ym) {
      rec.monthlyUsageCount = 0;
      rec.usageMonth = ym;
    }
    rec.usageCount = (rec.usageCount || 0) + 1;
    rec.monthlyUsageCount = (rec.monthlyUsageCount || 0) + 1;
    this.subscriptions.set(id, rec);
    return { ...rec };
  }

  async updateSubscriptionUsage(id, newCount) {
    const rec = this.subscriptions.get(id);
    if (!rec) return null;
    const ym = new Date().toISOString().substr(0, 7);
    rec.usageCount = newCount;
    rec.monthlyUsageCount = newCount;
    rec.usageMonth = ym;
    this.subscriptions.set(id, rec);
    return { ...rec };
  }
}
