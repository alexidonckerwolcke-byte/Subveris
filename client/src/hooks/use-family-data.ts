import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/lib/subscription-context";

export function useFamilyDataMode() {
  const { user, isPremium, planType } = useAuth();
  const { tier } = useSubscription();
  const hasPaidAccess = isPremium || planType === "premium" || planType === "family" || tier !== "free";
  const cachedGroupId = typeof window !== "undefined" && user?.id
    ? localStorage.getItem(`subveris-family-group:${user.id}`)
    : null;
  const cachedMode = typeof window !== "undefined" && user?.id && cachedGroupId
    ? localStorage.getItem(`subveris-family-mode:${user.id}:${cachedGroupId}`) === "true"
    : false;

  // Get family groups for this user
  const { data: familyGroups, isLoading: familyGroupsLoading } = useQuery<any[], Error>({
    queryKey: ["/api/family-groups"],
    enabled: !!user?.id,
    initialData: cachedGroupId ? [{ id: cachedGroupId }] : undefined,
    staleTime: 60 * 1000,
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
    initialData: cachedGroupId === familyGroupId && cachedMode
      ? { show_family_data: true, family_group_id: familyGroupId }
      : undefined,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!familyGroupId) return null;
      const response = await apiRequest('GET', `/api/family-groups/${familyGroupId}/settings`);
      return response.json();
    },
  });

  // only determine family mode after the family group and settings queries are complete
  const isFamilyDataModeReady = !familyGroupsLoading && (!familyGroupId || !familySettingsLoading);

  const showFamilyData = familyGroupsLoading && !cachedGroupId
    ? undefined
    : familyGroupId
      ? familySettingsLoading && !cachedMode
        ? undefined
        : hasPaidAccess && familySettings?.show_family_data === true
      : false;

  useEffect(() => {
    if (!user?.id || !familyGroupId) return;
    localStorage.setItem(`subveris-family-group:${user.id}`, familyGroupId);
    if (familySettings && typeof familySettings.show_family_data === 'boolean') {
      localStorage.setItem(
        `subveris-family-mode:${user.id}:${familyGroupId}`,
        String(familySettings.show_family_data),
      );
    }
  }, [user?.id, familyGroupId, familySettings]);

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
