import { describe, expect, it } from "vitest";
import { calculatePotentialSavings } from "../client/src/lib/health-score";

describe("potential savings deletion filtering", () => {
  it("excludes a soft-deleted row even when its status is still active", () => {
    const savings = calculatePotentialSavings([
      {
        id: "deleted-active",
        name: "Netflix",
        status: "active",
        deleted_at: "2026-04-05T00:00:00.000Z",
        amount: 15.99,
        frequency: "monthly",
      },
    ]);

    expect(savings).toBe(0);
  });
});
