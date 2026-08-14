import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockInvalidateQueries = vi.fn();

vi.mock("../client/src/lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: mockInvalidateQueries,
  },
  apiRequest: vi.fn(),
}));

import { invalidateAfterUsage } from "../client/src/components/subscription-card";
import { PER_PAGE } from "../client/src/lib/constants";

describe("invalidateAfterUsage helper", () => {
  beforeEach(() => {
    mockInvalidateQueries.mockClear();
  });

  it("invalidates personal keys regardless of family mode", () => {
    invalidateAfterUsage(false, undefined);

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/subscriptions"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/subscriptions", PER_PAGE] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/metrics"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/analysis/cost-per-use"] });
    // no family keys added
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(4);
  });

  it("also invalidates family-related keys when in family mode", () => {
    const groupId = "group-123";
    invalidateAfterUsage(true, groupId);

    // base calls plus two family-specific
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: [`/api/analysis/cost-per-use?familyGroupId=${groupId}`] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/family-groups", groupId, "family-data"] });

    // ensure total calls >=6
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(6);
  });
});
