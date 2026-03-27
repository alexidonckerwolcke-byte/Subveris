import { MemStorage } from "../server/storage";

describe("monthly usage tracking", () => {
  it("increments both usageCount and monthlyUsageCount when logging usage", async () => {
    const store = new MemStorage();
    const sub = await store.createSubscription({
      userId: "u1",
      name: "Test Plan",
      category: "other",
      amount: 10,
      frequency: "monthly",
      nextBillingDate: "2026-03-01",
    });

    expect(sub.usageCount).toBe(0);
    expect(sub.monthlyUsageCount).toBeUndefined();

    const updated = await store.recordSubscriptionUsage(sub.id);
    expect(updated).toBeDefined();
    expect(updated?.usageCount).toBe(1);
    expect(updated?.monthlyUsageCount).toBe(1);
    expect(updated?.usageMonth).toBe(new Date().toISOString().substr(0, 7));

    const again = await store.recordSubscriptionUsage(sub.id);
    expect(again?.usageCount).toBe(2);
    expect(again?.monthlyUsageCount).toBe(2);
  });

  it("updateSubscriptionUsage sets monthlyUsageCount to provided value", async () => {
    const store = new MemStorage();
    const sub = await store.createSubscription({
      userId: "u1",
      name: "Another Plan",
      category: "other",
      amount: 5,
      frequency: "monthly",
      nextBillingDate: "2026-03-01",
    });

    const updated = await store.updateSubscriptionUsage(sub.id, 5);
    expect(updated?.usageCount).toBe(5);
    expect(updated?.monthlyUsageCount).toBe(5);
    expect(updated?.usageMonth).toBe(new Date().toISOString().substr(0, 7));
  });

  it("resets monthlyUsageCount when crossing into a new month", async () => {
    const store = new MemStorage();
    const sub = await store.createSubscription({
      userId: "u1",
      name: "Monthly Reset",
      category: "other",
      amount: 7,
      frequency: "monthly",
      nextBillingDate: "2026-03-01",
    });

    // first log to set some values
    await store.recordSubscriptionUsage(sub.id);

    // manually mutate internal record to simulate last-month data
    const current = (store as any).subscriptions.get(sub.id);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().substr(0, 7);
    current.usageMonth = lastMonthStr;
    current.monthlyUsageCount = 10;
    (store as any).subscriptions.set(sub.id, current);

    const after = await store.recordSubscriptionUsage(sub.id);
    expect(after?.monthlyUsageCount).toBe(1);
    expect(after?.usageMonth).toBe(new Date().toISOString().substr(0, 7));
  });
});
