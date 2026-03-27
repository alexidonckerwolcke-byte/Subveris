import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { CostPerUse } from "@/components/cost-per-use";
import { computeCostPerUseFromSubs } from "@/lib/cost-analysis";
import { computeFamilyMetrics, FamilyMetrics } from "@/lib/family-metrics";
import { filterAvailableToShare } from "@/lib/family-sharing-utils";
import type { FamilyGroup, FamilyGroupMember, Subscription } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCurrency, type Currency } from "@/lib/currency-context";
import { useAuth } from "@/lib/auth-context";

export function FamilySharing() {
  const { toast } = useToast();
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const [newGroupName, setNewGroupName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<FamilyGroup | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Fetch family groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery<FamilyGroup[]>({
    queryKey: ["/api/family-groups"],
  });

  // Fetch family members for selected group
  const { data: members = [], isLoading: membersLoading } = useQuery<FamilyGroupMember[]>({
    queryKey: ["/api/family-groups", selectedGroupId, "members"],
    enabled: !!selectedGroupId,
  });

  // determine whether current user owns the selected group
  const isOwner = !!selectedGroupId &&
    groups.some((g) => g.id === selectedGroupId && g.ownerId === user?.id);


  // Fetch all subscriptions
  const { data: allSubscriptions = [] } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  // helper for computing which subscriptions are eligible for sharing
  // (implementation moved to a shared utility module)

  // Fetch selected member's full data
  const { data: memberData } = useQuery<any>({
    queryKey: ["/api/family-groups", selectedGroupId, "members", selectedMemberId, "dashboard"],
    enabled: !!selectedGroupId && !!selectedMemberId,
  });

  // Fetch family group settings
  const { data: familySettings, isLoading: settingsLoading, error: settingsError } = useQuery<any>({
    queryKey: ["/api/family-groups", selectedGroupId, "settings"],
    enabled: !!selectedGroupId,
    retry: 3,
  });

  // Fetch aggregated family data
  const { data: familyData } = useQuery<any>({
    queryKey: ["/api/family-groups", selectedGroupId, "family-data"],
    enabled: !!selectedGroupId && familySettings?.show_family_data,
  });

  // compute list of subscriptions that can be shared (excludes already-shared)
  const availableToShare = filterAvailableToShare(
    allSubscriptions,
    familyData?.sharedSubscriptions
  );

  // Compute simple metrics client-side as a fallback when server doesn't provide precomputed metrics
  const familyMetrics: FamilyMetrics = computeFamilyMetrics(familyData);
  // whichever metrics object we display (server may eventually add metrics to the
  // family-data payload, so prefer that with a fallback to our computed values)
  const displayMetrics = familyData?.metrics ?? familyMetrics;

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/family-groups", { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups"] });
      setNewGroupName("");
      toast({
        title: "Family group created",
        description: "Your family group has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create family group",
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await apiRequest("DELETE", `/api/family-groups/${groupId}`);
    },
    onSuccess: async () => {
      // Invalidate and force refetch of family groups and membership info
      await queryClient.invalidateQueries({ queryKey: ["/api/family-groups"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/family-groups/me/membership"] });
      await queryClient.refetchQueries({ queryKey: ["/api/family-groups"], exact: true });
      await queryClient.refetchQueries({ queryKey: ["/api/family-groups/me/membership"], exact: true });
      setSelectedGroupId(null);
      toast({
        title: "Family group deleted",
        description: "The family group has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete family group",
        variant: "destructive",
      });
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (memberIdentifier: string) => {
      if (!selectedGroupId) {
        throw new Error("No family group selected");
      }
      const response = await apiRequest("POST", `/api/family-groups/${selectedGroupId}/members`, {
        memberIdentifier,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups", selectedGroupId, "members"] });
      setNewMemberEmail("");
      toast({
        title: "Member added",
        description: "Family member has been added successfully.",
      });
    },
    onError: (error: any) => {
      const errorMsg = error?.message || "Failed to add family member";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/family-groups/${selectedGroupId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups", selectedGroupId, "members"] });
      toast({
        title: "Member removed",
        description: "Family member has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove family member",
        variant: "destructive",
      });
    },
  });


  // Share subscription mutation (owner only)
  const shareSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      if (!selectedGroupId) throw new Error('No group selected');
      const res = await apiRequest('POST', `/api/family-groups/${selectedGroupId}/share-subscription`, { subscriptionId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups", selectedGroupId, "family-data"] });
      toast({ title: 'Shared', description: 'Subscription has been shared.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.message || 'Failed to share subscription', variant: 'destructive' });
    }
  });

  // Unshare mutation
  const unshareSubscriptionMutation = useMutation({
    mutationFn: async (sharedId: string) => {
      if (!selectedGroupId) throw new Error('No group selected');
      await apiRequest('DELETE', `/api/family-groups/${selectedGroupId}/shared-subscriptions/${sharedId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups", selectedGroupId, "family-data"] });
      toast({ title: 'Unshared', description: 'Subscription removed from family group.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.message || 'Failed to unshare', variant: 'destructive' });
    }
  });

  // assign cost splits simply via prompts
  const assignSplits = async (sharedId: string) => {
    if (!selectedGroupId || !familyData) return;
    const membersList: any[] = familyData.members || [];
    for (const m of membersList) {
      const val = window.prompt(`Enter split % for ${m.email}`, '0');
      if (val !== null) {
        const num = Number(val);
        if (!isNaN(num)) {
          try {
            await apiRequest('POST', `/api/family-groups/${selectedGroupId}/shared-subscriptions/${sharedId}/cost-splits`, {
              userId: m.user_id,
              percentage: num,
            });
          } catch (e: any) {
            console.error('split error', e);
          }
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/family-groups", selectedGroupId, "family-data"] });
    toast({ title: 'Splits saved', description: 'Cost splits have been recorded.' });
  };

  // Owner updating a member's subscription status
  const updateMemberSubStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      console.debug('[FamilySharing] updating member subscription', id, status);
      const res = await apiRequest('PATCH', `/api/subscriptions/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups", selectedGroupId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups", selectedGroupId, "family-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups", selectedGroupId, "members", selectedMemberId, "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/monthly-savings"], exact: false });
      toast({ title: 'Subscription updated', description: 'Status updated successfully.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.message || 'Failed to update status', variant: 'destructive' });
    }
  });

  // Owner updating a member's subscription usage count
  const updateMemberSubUsageMutation = useMutation({
    mutationFn: async ({ id, usageCount }: { id: string; usageCount: number }) => {
      const res = await apiRequest('PATCH', `/api/subscriptions/${id}/usage`, { usageCount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups", selectedGroupId, "members", selectedMemberId, "dashboard"] });
      queryClient.invalidateQueries({ queryKey: [`/api/analysis/cost-per-use?familyGroupId=${selectedGroupId}`] });
      toast({ title: 'Usage updated', description: 'Usage count updated successfully.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.message || 'Failed to update usage', variant: 'destructive' });
    }
  });

  // Toggle family data view mutation
  const toggleFamilyDataMutation = useMutation({
    mutationFn: async (showFamilyData: boolean) => {
      const response = await apiRequest("PUT", `/api/family-groups/${selectedGroupId}/settings`, {
        // API expects snake_case key
        show_family_data: showFamilyData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('[toggleFamilyData] Success:', data);
      // Update cache with new settings data
      queryClient.setQueryData(
        ["/api/family-groups", selectedGroupId, "settings"],
        data
      );
      // Invalidate family data to force refetch
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups", selectedGroupId, "family-data"] });
      
      toast({
        title: "Settings updated",
        description: data?.show_family_data 
          ? "Now viewing combined family data."
          : "Now viewing personal data only.",
      });
    },
    onError: (error: any) => {
      console.error('[toggleFamilyData] Error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="space-y-4">
      {/* Create New Group */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family Groups
          </CardTitle>
          <CardDescription>Create and manage family subscription sharing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New Group Form */}
          <div className="flex gap-2">
            <Input
              placeholder="Family group name (e.g., 'My Family')"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newGroupName) {
                  createGroupMutation.mutate(newGroupName);
                }
              }}
            />
            <Button
              onClick={() => newGroupName && createGroupMutation.mutate(newGroupName)}
              disabled={!newGroupName || createGroupMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>

          {/* Groups List */}
          {groupsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : groups.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No family groups yet. Create one to start sharing subscriptions!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedGroupId === group.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{group.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {group.memberCount || 0} members
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setGroupToDelete(group);
                        setDeleteDialogOpen(true);
                        setDeleteConfirmText("");
                      }}
                      disabled={deleteGroupMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Group Details */}
      {selectedGroup && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Members */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Family Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  <strong>Note:</strong> Family members must create an account first before you can add them to your family group.
                </AlertDescription>
              </Alert>

              {/* Add Member Form */}
              <div className="flex gap-2">
                <Input
                  placeholder="Member email or ID"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newMemberEmail) {
                      addMemberMutation.mutate(newMemberEmail);
                    }
                  }}
                />
                <Button
                  onClick={() => newMemberEmail && addMemberMutation.mutate(newMemberEmail)}
                  disabled={!newMemberEmail || addMemberMutation.isPending}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Members List */}
              {membersLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members yet</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2 flex-1">
                        <Badge variant="outline">
                          {member.role === 'owner' ? '👑 Owner' : '👤 Member'}
                        </Badge>
                        <div className="flex flex-col gap-1 flex-1">
                          <span className="text-sm font-medium">
                            {member.userId === user?.id ? `You (${member.email})` : (member.email || `User: ${member.userId.slice(0, 8)}`)}
                          </span>
                          {member.subscription && (
                            <span className="text-xs text-muted-foreground">
                              Plan: <span className="font-medium capitalize">{member.subscription.plan_type}</span> • 
                              Status: <span className="font-medium capitalize">{member.subscription.status}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {member.userId !== user?.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedMemberId(member.userId)}
                              title="View subscriptions and insights"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMemberMutation.mutate(member.id)}
                              disabled={removeMemberMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Family Data View Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">View Combined Family Data</CardTitle>
            <CardDescription>
              Toggle to see all your family members' subscriptions, spending, and insights combined on your main dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Failed to load family settings: {settingsError.message}
                </AlertDescription>
              </Alert>
            )}
            
            {settingsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex items-center justify-between p-3 rounded border">
                <div>
                  <div className="font-medium">Show Family Data</div>
                  <div className="text-sm text-muted-foreground">
                    {familySettings?.show_family_data 
                      ? "✓ You're viewing combined family data"
                      : "Your personal data only"}
                  </div>
                </div>
                <Button
                  variant={familySettings?.show_family_data ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    console.log('[toggle] Current show_family_data:', familySettings?.show_family_data);
                    toggleFamilyDataMutation.mutate(!familySettings?.show_family_data);
                  }}
                  disabled={toggleFamilyDataMutation.isPending || settingsLoading}
                >
                  {toggleFamilyDataMutation.isPending ? "Updating..." : (familySettings?.show_family_data ? "Disable" : "Enable")}
                </Button>
              </div>
            )}

            {familySettings?.show_family_data && familyData && (
              <div className="border-t pt-4 space-y-4">
                {/* Strict actionable subscriptions filtering for dashboard */}
                <div className="grid grid-cols-1 gap-2">
                  {familyData.subscriptions && familyData.subscriptions
                    .filter((sub: any) =>
                      (sub.status === 'unused' || sub.status === 'to-cancel') ||
                      (sub.subStatus === 'unused' || sub.subStatus === 'to-cancel')
                    )
                    .map((sub: any) => (
                      <div key={sub.id} className="flex items-center justify-between p-3 rounded border">
                        <div>
                          <div className="font-medium">{sub.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatAmount(sub.amount, sub.currency as Currency)} / {sub.frequency}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                            {sub.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  {(!familyData.subscriptions || familyData.subscriptions.filter((sub: any) =>
                    (sub.status === 'unused' || sub.status === 'to-cancel') ||
                    (sub.subStatus === 'unused' || sub.subStatus === 'to-cancel')
                  ).length === 0) && (
                    <p className="text-sm text-muted-foreground">No actionable subscriptions</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Family Group</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All members will be removed from this family group, but their personal subscription data will remain.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> Deleting "{groupToDelete?.name}" will:
                <ul className="list-disc list-inside mt-2 ml-2 text-sm space-y-1">
                  <li>Remove all members from the family group</li>
                  <li>Delete shared subscription assignments</li>
                  <li>Keep each member's personal subscription data</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type "delete" to confirm deletion of "{groupToDelete?.name}":
              </label>
              <Input
                placeholder='Type "delete"'
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setGroupToDelete(null);
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "delete" || deleteGroupMutation.isPending}
              onClick={() => {
                if (groupToDelete) {
                  deleteGroupMutation.mutate(groupToDelete.id, {
                    onSuccess: () => {
                      setDeleteDialogOpen(false);
                      setGroupToDelete(null);
                      setDeleteConfirmText("");
                    },
                  });
                }
              }}
            >
              Delete Family Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Details Dialog */}
      <Dialog open={!!selectedMemberId} onOpenChange={(open) => !open && setSelectedMemberId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              View {members.find(m => m.userId === selectedMemberId)?.email}'s subscriptions and insights
            </DialogDescription>
          </DialogHeader>

          {!memberData ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Member's Subscriptions */}
              <div>
                <h3 className="font-semibold text-base mb-3">Subscriptions</h3>
                {memberData.subscriptions && memberData.subscriptions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {memberData.subscriptions
                      .filter((sub: Subscription) =>
                        (sub.status === 'unused' || sub.status === 'to-cancel') ||
                        (sub.subStatus === 'unused' || sub.subStatus === 'to-cancel')
                      )
                      .map((sub: Subscription) => (
                        <div key={sub.id} className="flex items-center justify-between p-3 rounded border">
                          <div>
                            <div className="font-medium">{sub.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatAmount(sub.amount, sub.currency as Currency)} / {sub.frequency}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                              {sub.status}
                            </Badge>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => updateMemberSubStatusMutation.mutate({ id: sub.id, status: 'active' })} disabled={updateMemberSubStatusMutation.isPending}>
                                Active
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateMemberSubStatusMutation.mutate({ id: sub.id, status: 'unused' })} disabled={updateMemberSubStatusMutation.isPending}>
                                Unused
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateMemberSubStatusMutation.mutate({ id: sub.id, status: 'to-cancel' })} disabled={updateMemberSubStatusMutation.isPending}>
                                Cancel
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => {
                                const val = window.prompt('Set usage count for ' + sub.name, String((sub as any).usage_count || 0));
                                if (val !== null) {
                                  const num = Number(val);
                                  if (!isNaN(num) && num >= 0) {
                                    updateMemberSubUsageMutation.mutate({ id: sub.id, usageCount: num });
                                  } else {
                                    toast({ title: 'Invalid value', description: 'Please enter a valid non-negative number', variant: 'destructive' });
                                  }
                                }
                              }}>
                                Set uses
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No subscriptions</p>
                )}
              </div>

              {/* Member's Spending */}
              <div>
                <h3 className="font-semibold text-base mb-3">Spending This Month</h3>
                {memberData.spending && memberData.spending.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {memberData.spending.map((month: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded border">
                        <div className="font-medium">{month.month}</div>
                        <div className="text-lg font-semibold">
                          {formatAmount(month.total, 'USD')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No spending data</p>
                )}
              </div>

                {/* Member Cost-per-use Analysis (computed locally if server doesn't provide) */}
                <div className="mt-4">
                  <h3 className="font-semibold text-base mb-3">Cost Per Use</h3>
                  {!memberData?.subscriptions || memberData.subscriptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No subscription data</p>
                  ) : (
                    <CostPerUse
                      analyses={computeCostPerUseFromSubs(
                        memberData.subscriptions.filter((s: any) => s && s.status !== 'deleted')
                      )}
                      isLoading={false}
                    />
                  )}
                </div>

              {/* Spending by Category */}
              {memberData.byCategory && memberData.byCategory.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base mb-3">By Category</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {memberData.byCategory.map((cat: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded border">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="capitalize font-medium flex-1">{cat.category}</div>
                          <div className="text-sm text-muted-foreground">{cat.count} subscriptions</div>
                        </div>
                        <div className="text-lg font-semibold">
                          {formatAmount(cat.amount, 'USD')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Insights & Recommendations */}
              {memberData.recommendations && memberData.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base mb-3">Recommendations</h3>
                  <div className="space-y-2">
                    {memberData.recommendations.map((rec: any, idx: number) => (
                      <Alert key={idx} className="border-blue-200 bg-blue-50">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-900">
                          {rec.title}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              {/* Behavioral Insights */}
              {memberData.behavioral && memberData.behavioral.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base mb-3">Insights</h3>
                  <div className="space-y-2">
                    {memberData.behavioral.map((insight: any, idx: number) => (
                      <Alert key={idx} className="border-amber-200 bg-amber-50">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-900">
                          {insight.description || insight.title}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              {/* Dashboard Metrics */}
              {memberData.metrics && (
                <div>
                  <h3 className="font-semibold text-base mb-3">Summary</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">
                          {formatAmount(memberData.metrics.totalMonthlySpending || 0, 'USD')}
                        </div>
                        <div className="text-sm text-muted-foreground">Monthly Spending</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold">
                          {memberData.subscriptions?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Active Subscriptions</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMemberId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}