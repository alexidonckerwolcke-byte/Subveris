import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";

export function useFamilyDataMode() {
  const { user } = useAuth();

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
        : familySettings?.show_family_data === true
      : false;

  // Safety: if no group, clear any state that depends on being in a group
  if (!familyGroups || familyGroups.length === 0) {
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
