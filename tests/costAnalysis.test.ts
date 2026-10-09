import { computeCostPerUseFromSubs } from "../client/src/lib/cost-analysis";

describe("computeCostPerUseFromSubs", () => {
  it("returns empty array when input is undefined or empty", () => {
    expect(computeCostPerUseFromSubs(undefined)).toEqual([]);
    expect(computeCostPerUseFromSubs([])).toEqual([]);
  });

  it("calculates values correctly for a single subscription", () => {
    const subs = [{
      id: "s1",
      name: "Test",
      amount: 12,
      frequency: "monthly",
      status: "active",
      usage_count: 3,
      currency: "USD",
    }];

    const result = computeCostPerUseFromSubs(subs);
    expect(result.length).toBe(1);
    expect(result[0].costPerUse).toBeCloseTo(4);
    expect(result[0].usageCount).toBe(3);
    // with 3 uses, we cap at 'fair' per computation rules
    expect(result[0].valueRating).toBe("fair");
  });

  it("handles zero usage and deleted subscriptions", () => {
    const subs = [
      { id: "s2", name: "Zero", amount: 10, frequency: "monthly", status: "active", usage_count: 0 },
      { id: "s3", name: "Del", amount: 5, frequency: "monthly", status: "deleted", usage_count: 10 },
    ];
    const result = computeCostPerUseFromSubs(subs);
    expect(result.length).toBe(1);
    expect(result[0].subscriptionId).toBe("s2");
    expect(result[0].costPerUse).toBe(10);
    expect(result[0].valueRating).toBe("poor");
  });

  it("accepts camelCase usageCount fields from family-data responses", () => {
    const subs = [{
      id: "s4",
      name: "Camel",
      amount: 20,
      frequency: "monthly",
      status: "active",
      usageCount: 4,
    }];
    const result = computeCostPerUseFromSubs(subs);
    expect(result.length).toBe(1);
    expect(result[0].usageCount).toBe(4);
    expect(result[0].costPerUse).toBeCloseTo(5);
    expect(result[0].valueRating).toBe("good");
  });

  it("uses the family timezone when checking the current usage month", () => {
    const result = computeCostPerUseFromSubs([{
      id: "s5",
      name: "Family timezone",
      amount: 20,
      frequency: "monthly",
      status: "active",
      usage_month: "2026-02",
      monthly_usage_count: 4,
    }], "America/Los_Angeles", new Date("2026-03-01T07:30:00.000Z"));

    expect(result[0].usageCount).toBe(4);
    expect(result[0].costPerUse).toBe(5);
  });

  it("excludes soft-deleted rows even if their status was not updated", () => {
    const result = computeCostPerUseFromSubs([{
      id: "s6",
      name: "Soft deleted",
      amount: 12,
      frequency: "monthly",
      status: "active",
      deleted_at: "2026-10-01T12:00:00.000Z",
      usage_count: 3,
    }]);

    expect(result).toEqual([]);
  });
});
