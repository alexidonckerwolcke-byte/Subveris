import { describe, expect, it } from "vitest";
import {
  getZonedMonthBounds,
  getZonedMonthKey,
  getZonedMonthKeyForDate,
  isValidTimeZone,
} from "../shared/month-boundary";
import { normalizeMonthlySpendingSeries } from "../client/src/lib/utils";

describe("IANA timezone month boundaries", () => {
  it("uses the account timezone month key near a UTC month boundary", () => {
    const beforeBrusselsMidnight = new Date("2026-10-31T21:30:00.000Z");
    const afterBrusselsMidnight = new Date("2026-10-31T23:30:00.000Z");

    expect(getZonedMonthKey(beforeBrusselsMidnight, "Europe/Brussels")).toBe("2026-10");
    expect(getZonedMonthKey(afterBrusselsMidnight, "Europe/Brussels")).toBe("2026-11");
  });

  it("calculates month boundaries across the spring daylight-saving change", () => {
    const bounds = getZonedMonthBounds(new Date("2026-03-15T12:00:00.000Z"), "Europe/Brussels");

    expect(bounds.monthKey).toBe("2026-03");
    expect(bounds.monthStart.toISOString()).toBe("2026-02-28T23:00:00.000Z");
    expect(bounds.nextMonthStart.toISOString()).toBe("2026-03-31T22:00:00.000Z");
  });

  it("keeps date-only renewals in their written calendar month", () => {
    expect(getZonedMonthKeyForDate("2026-03-01", "America/Los_Angeles")).toBe("2026-03");
    expect(getZonedMonthKeyForDate("2026-03-01T00:30:00.000Z", "America/Los_Angeles")).toBe("2026-02");
  });

  it("labels the current spending month in the supplied timezone", () => {
    const series = normalizeMonthlySpendingSeries(
      [{ month: "Feb 2026", amount: 12 }],
      0,
      "America/Los_Angeles",
      new Date("2026-03-01T07:30:00.000Z"),
    );

    expect(series).toEqual([{ month: "Feb 2026", amount: 12 }]);
  });

  it("rejects invalid timezone identifiers", () => {
    expect(isValidTimeZone("Europe/Brussels")).toBe(true);
    expect(isValidTimeZone("Not/A-Timezone")).toBe(false);
  });
});