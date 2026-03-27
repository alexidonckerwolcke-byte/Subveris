import { invalidateAfterUsage } from "../client/src/components/subscription-card";
import { queryClient } from "../client/src/lib/queryClient";
import { PER_PAGE } from "../client/src/lib/constants";

describe("invalidateAfterUsage helper", () => {
  beforeEach(() => {
    vi.spyOn(queryClient, "invalidateQueries").mockClear();
  });

  it("invalidates personal keys regardless of family mode", () => {
    invalidateAfterUsage(false, undefined);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/subscriptions"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/subscriptions", PER_PAGE] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/metrics"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/analysis/cost-per-use"] });
    // no family keys added
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(4);
  });

  it("also invalidates family-related keys when in family mode", () => {
    const groupId = "group-123";
    invalidateAfterUsage(true, groupId);

    // base calls plus two family-specific
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: [`/api/analysis/cost-per-use?familyGroupId=${groupId}`] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/family-groups", groupId, "family-data"] });

    // ensure total calls >=6
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(6);
  });
});
