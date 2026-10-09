import { describe, expect, it } from "vitest";
import { isSubscriptionSavingsEventInCurrentMonth } from "../client/src/lib/savings-month";

describe("monthly savings event dates", () => {
  const now = new Date(2026, 9, 8, 12);

  it("counts a deletion from the current local month", () => {
    expect(isSubscriptionSavingsEventInCurrentMonth({
      status: "deleted",
      deleted_at: new Date(2026, 9, 2, 9).toISOString(),
    }, now)).toBe(true);
  });

  it("does not carry a previous month's deletion into this month", () => {
    expect(isSubscriptionSavingsEventInCurrentMonth({
      status: "deleted",
      deleted_at: new Date(2026, 8, 30, 23).toISOString(),
    }, now)).toBe(false);
  });

  it("does not count historical deletions based on a later updated_at", () => {
    expect(isSubscriptionSavingsEventInCurrentMonth({
      status: "deleted",
      updated_at: new Date(2026, 9, 3, 9).toISOString(),
    }, now)).toBe(false);
  });

  it("uses an actual cancellation timestamp when available", () => {
    expect(isSubscriptionSavingsEventInCurrentMonth({
      status: "canceled",
      canceled_at: new Date(2026, 9, 4, 9).toISOString(),
    }, now)).toBe(true);
  });

  it("uses the family timezone when deciding whether a deletion is in this month", () => {
    expect(isSubscriptionSavingsEventInCurrentMonth({
      status: "deleted",
      deleted_at: "2026-03-01T07:15:00.000Z",
    }, new Date("2026-03-01T07:30:00.000Z"), "America/Los_Angeles")).toBe(true);

    expect(isSubscriptionSavingsEventInCurrentMonth({
      status: "deleted",
      deleted_at: "2026-03-01T07:15:00.000Z",
    }, new Date("2026-03-01T08:30:00.000Z"), "America/Los_Angeles")).toBe(false);
  });
});