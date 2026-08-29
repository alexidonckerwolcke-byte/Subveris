import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/lib/subscription-context";

export function mergeFamilyGroupsForUser(ownerGroups: any[] = [], membershipGroups: any[] = []) {
  const merged = new Map<string, any>();

  for (const group of [...(ownerGroups || []), ...(membershipGroups || [])]) {
    if (!group || !group.id) continue;

    const normalized = {
      ...group,
      id: group.id,
      name: group.name || 'Family group',
      ownerId: group.ownerId ?? group.owner_id,
      createdAt: group.createdAt ?? group.created_at,
      role: group.role || 'member',
    };

    const existing = merged.get(normalized.id);
    merged.set(normalized.id, {
      ...existing,
      ...normalized,
      role: existing?.role || normalized.role,
    });
  }

  return [...merged.values()];
}

export function shouldUseFamilyAwareSpending(familyGroupId?: string | null, showFamilyData?: boolean, isFamilyGroupOwner?: boolean): boolean {
  if (!familyGroupId) return false;
  return Boolean(showFamilyData || (typeof isFamilyGroupOwner === 'boolean' && !isFamilyGroupOwner));
}

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

  const { data: membershipData } = useQuery<any, Error>({
    queryKey: ["/api/family-groups/me/membership"],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/family-groups/me/membership');
      return response.json();
    },
  });

  // Get family groups for this user, including groups where the user is a member.
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

  const mergedFamilyGroups = mergeFamilyGroupsForUser(familyGroups || [], membershipData?.groups || []);

  // Prefer a group owned by the current user when both owner and member groups exist.
  const ownedFamilyGroup = mergedFamilyGroups.find((group) => {
    const role = String(group?.role || '').toLowerCase();
    return user?.id && (group?.ownerId === user.id || role === 'owner');
  });
  const familyGroupId = ownedFamilyGroup?.id || mergedFamilyGroups[0]?.id;
  const isFamilyGroupOwner = Boolean(ownedFamilyGroup && user?.id);

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
      isFamilyGroupOwner: false,
    };
  }

  return {
    familyGroupId,
    showFamilyData,
    isInFamily: !!familyGroupId,
    isFamilyDataModeReady,
    isFamilyGroupOwner,
  };
}
