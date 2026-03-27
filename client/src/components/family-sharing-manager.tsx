import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, Plus, Trash2, Share2, AlertCircle } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { FamilyGroup, FamilyGroupMember, Subscription } from '@shared/schema';

interface FamilySharingProps {
  subscriptions: Subscription[];
}

export function FamilySharingManager({ subscriptions }: FamilySharingProps) {
  const { toast } = useToast();
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Fetch family groups
  const { data: familyGroups = [], isLoading: groupsLoading } = useQuery<FamilyGroup[]>({
    queryKey: ['/api/family-groups'],
  });

  // Fetch family members
  const { data: familyMembers = [], isLoading: membersLoading } = useQuery<FamilyGroupMember[]>({
    queryKey: selectedGroup ? [`/api/family-groups/${selectedGroup}/members`] : [],
    enabled: !!selectedGroup,
  });

  // Create family group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', '/api/family-groups', { name });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-groups'] });
      setNewGroupName('');
      setShowNewGroup(false);
      setSelectedGroup(data.id);
      toast({
        title: 'Success',
        description: 'Family group created successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create family group',
        variant: 'destructive',
      });
    },
  });

  // Delete family group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const res = await apiRequest('DELETE', `/api/family-groups/${groupId}`);
      // 204 No Content has no body, so don't try to parse JSON
      if (res.status === 204) {
        return { success: true };
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family-groups', 'family-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights/behavioral'] });
      setSelectedGroup(null);
      toast({
        title: 'Success',
        description: 'Family group deleted.',
      });
      // Force reload to clear any stale state in hooks/UI
      setTimeout(() => window.location.reload(), 500);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete family group',
        variant: 'destructive',
      });
    },
  });

  // Remove family member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, memberId }: { groupId: string; memberId: string }) => {
      const res = await apiRequest('DELETE', `/api/family-groups/${groupId}/members/${memberId}`);
      // 204 No Content has no body, so don't try to parse JSON
      if (res.status === 204) {
        return { success: true };
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/family-groups', 'family-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stripe/subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights/behavioral'] });
      if (selectedGroup) {
        queryClient.invalidateQueries({ queryKey: [`/api/family-groups/${selectedGroup}/members`] });
      }
      toast({
        title: 'Success',
        description: 'Member removed from family.',
      });
      // Force reload to clear any stale state in hooks/UI
      setTimeout(() => window.location.reload(), 500);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    },
  });

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a group name',
        variant: 'destructive',
      });
      return;
    }
    createGroupMutation.mutate(newGroupName);
  };

  return (
    <div className="space-y-4">
      {/* Family Groups List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Family Groups
              </CardTitle>
              <CardDescription>Manage and share subscriptions with family members</CardDescription>
            </div>
            <Button
              onClick={() => setShowNewGroup(!showNewGroup)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Group
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Create new group form */}
          {showNewGroup && (
            <div className="border rounded-lg p-4 space-y-3">
              <Input
                placeholder="Group name (e.g., My Family)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateGroup}
                  disabled={createGroupMutation.isPending}
                >
                  Create Group
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowNewGroup(false);
                    setNewGroupName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Groups list */}
          {groupsLoading ? (
            <p className="text-sm text-gray-600">Loading...</p>
          ) : familyGroups.length === 0 ? (
            <p className="text-sm text-gray-600">No family groups yet. Create one to get started!</p>
          ) : (
            <div className="space-y-2">
              {familyGroups.map((group) => (
                <div
                  key={group.id}
                  className={`p-3 border rounded-lg cursor-pointer transition ${
                    selectedGroup === group.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedGroup(group.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{group.name}</h4>
                      <p className="text-xs text-gray-600">Created {new Date(group.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this family group?')) {
                          deleteGroupMutation.mutate(group.id);
                        }
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
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
          {/* Members Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Group Members
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Add member form */}
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Invite family member</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Member email or user ID"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                  />
                  <Button size="sm" onClick={() => {
                    if (newMemberEmail) {
                      // Would need to implement user lookup by email
                      toast({
                        title: 'Note',
                        description: 'Please provide the user ID to invite. Email lookup coming soon.',
                      });
                    }
                  }}>
                    Invite
                  </Button>
                </div>
              </div>

              {/* Members list */}
              {membersLoading ? (
                <p className="text-sm text-gray-600">Loading...</p>
              ) : familyMembers.length === 0 ? (
                <p className="text-sm text-gray-600">No members yet. Invite family members to share subscriptions.</p>
              ) : (
                <div className="space-y-2">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                      <div>
                        <p className="text-sm font-medium">{member.userId}</p>
                        <Badge variant="secondary">{member.role}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Remove this member?')) {
                            removeMemberMutation.mutate({
                              groupId: selectedGroup,
                              memberId: member.userId,
                            });
                          }
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shared Subscriptions Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share Subscriptions
              </CardTitle>
              <CardDescription>Select subscriptions to share with this family group</CardDescription>
            </CardHeader>

            <CardContent>
              {subscriptions.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No subscriptions to share. Add subscriptions first in your main list.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                      <div>
                        <p className="font-medium text-sm">{sub.name}</p>
                        <p className="text-xs text-gray-600">
                          ${sub.amount.toFixed(2)}/{sub.frequency}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          toast({
                            title: 'Coming Soon',
                            description: 'Sharing will be available in the next update.',
                          });
                        }}
                      >
                        Share
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
