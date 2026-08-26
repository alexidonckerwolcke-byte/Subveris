import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/lib/subscription-context";

export function useFamilyDataMode() {
  const { user, isPremium, planType } = useAuth();
  const { tier } = useSubscription();
  const hasPaidAccess = isPremium || planType === "premium" || planType === "family" || tier !== "free";

  // Get family groups for this user
  const { data: familyGroups, isLoading: familyGroupsLoading } = useQuery<any[], Error>({
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
  const { data: familySettings, isLoading: familySettingsLoading } = useQuery<any, Error>({
    queryKey: ["/api/family-groups", familyGroupId, "settings"],
    enabled: !!familyGroupId,
    queryFn: async () => {
      if (!familyGroupId) return null;
      const response = await apiRequest('GET', `/api/family-groups/${familyGroupId}/settings`);
      return response.json();
    },
  });

  // only determine family mode after the family group and settings queries are complete
  const isFamilyDataModeReady = !familyGroupsLoading && (!familyGroupId || !familySettingsLoading);

  const showFamilyData = familyGroupsLoading
    ? undefined
    : familyGroupId
      ? familySettingsLoading
        ? undefined
        : hasPaidAccess && familySettings?.show_family_data === true
      : false;

  useEffect(() => {
    if (!hasPaidAccess && familyGroupId) {
      queryClient.setQueryData(["/api/family-groups", familyGroupId, "settings"], {
        show_family_data: false,
        family_group_id: familyGroupId,
      });
    }
  }, [hasPaidAccess, familyGroupId]);

  if (familyGroupsLoading) {
    return {
      familyGroupId: undefined,
      showFamilyData: false,
      isInFamily: false,
      isFamilyDataModeReady: true,
    };
  }

  return {
    familyGroupId,
    showFamilyData,
    isInFamily: !!familyGroupId,
    isFamilyDataModeReady,
  };
}
