import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/lib/subscription-context";

export function useFamilyDataMode() {
  const { user } = useAuth();
  const { tier } = useSubscription();

  // Get family groups for this user
  const { data: familyGroups } = useQuery<any[], Error>({
    queryKey: ["/api/family-groups"],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/family-groups');
      return response.json();
    },
  });

  // Get the family group for this user (owner's group)
  const familyGroupId = familyGroups?.[0]?.id;

  // Get family settings if user is in a family group
  const { data: familySettings } = useQuery<any, Error>({
    queryKey: ["/api/family-groups", familyGroupId, "settings"],
    enabled: !!familyGroupId,
    queryFn: async () => {
      if (!familyGroupId) return null;
      const response = await apiRequest('GET', `/api/family-groups/${familyGroupId}/settings`);
      return response.json();
    },
  });

  // Family data is only available while the user still has an eligible plan.
  const isFamilyAccessEnabled = tier !== "free" && familySettings?.show_family_data === true && !!familyGroupId;
  const showFamilyData = isFamilyAccessEnabled;

  useEffect(() => {
    if (tier === "free") {
      queryClient.setQueryData(["/api/family-groups", familyGroupId, "settings"], {
        show_family_data: false,
        family_group_id: familyGroupId,
      });
    }
  }, [tier, familyGroupId]);

  // Safety: if no group, clear any state that depends on being in a group
  if (!familyGroups || familyGroups.length === 0) {
    return {
      familyGroupId: undefined,
      showFamilyData: false,
      isInFamily: false,
    };
  }

  return {
    familyGroupId,
    showFamilyData,
    isInFamily: !!familyGroupId,
  };
}
