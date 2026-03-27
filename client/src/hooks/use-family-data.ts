import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";

export function useFamilyDataMode() {
  const { user } = useAuth();

  // Get family groups for this user
  const { data: familyGroups } = useQuery<any[]>({
    queryKey: ["/api/family-groups"],
    enabled: !!user?.id,
    onSuccess: (data) => {
      console.log('[DEBUG] /api/family-groups response:', data);
    },
  });

  // Get the family group for this user (owner's group)
  const familyGroupId = familyGroups?.[0]?.id;

  // Get family settings if user is in a family group
  const { data: familySettings } = useQuery<any>({
    queryKey: ["/api/family-groups", familyGroupId, "settings"],
    enabled: !!familyGroupId,
    onSuccess: (data) => {
      console.log('[DEBUG] /api/family-groups/[id]/settings response:', data);
    },
  });

  // Check if we should show family data
  const showFamilyData = familySettings?.show_family_data === true && !!familyGroupId;

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
