import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Info, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { FamilyGroup } from "@shared/schema";

interface FamilyMembershipData {
  groups: FamilyGroup[];
  isMemberOfFamily: boolean;
  membershipCount: number;
  membershipInfo: Array<{
    family_group_id: string;
    role: string;
    joined_at: string;
  }>;
}

export function FamilyMembershipBanner() {
  const { data: membershipData, isLoading } = useQuery<FamilyMembershipData>({
    queryKey: ["/api/family-groups/me/membership"],
    onSuccess: (data) => {
      console.log('[DEBUG] /api/family-groups/me/membership response:', data);
    },
  });

  if (isLoading) {
    return null;
  }

  if (!membershipData || !membershipData.isMemberOfFamily) {
    return null;
  }

  // Separate owned groups from member groups based on role
  const ownedGroups = membershipData.groups.filter(g => 
    membershipData.membershipInfo.some(m => m.family_group_id === g.id && m.role === "owner")
  );
  
  const memberGroups = membershipData.groups.filter(g => 
    membershipData.membershipInfo.some(m => m.family_group_id === g.id && m.role !== "owner")
  );

  return (
    <div className="space-y-3">
      {/* Member of family banner */}
      {memberGroups.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Users className="h-4 w-4 text-blue-600" />
          <div className="flex items-center justify-between flex-1">
            <div className="flex-1">
              <AlertDescription className="text-blue-800">
                <p className="font-medium">You're a member of a family group</p>
                <div className="text-sm mt-1 flex flex-wrap gap-2">
                  {memberGroups.map((g, i) => (
                    <Badge key={g.id} variant="secondary">{g.name}</Badge>
                  ))}
                </div>
              </AlertDescription>
            </div>
            <Link href="/family-sharing">
              <Button size="sm" variant="outline" className="ml-4">
                View <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </Alert>
      )}

      {/* Owner of family banner */}
      {ownedGroups.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <Info className="h-4 w-4 text-green-600" />
          <div className="flex items-center justify-between flex-1">
            <div className="flex-1">
              <AlertDescription className="text-green-800">
                <p className="font-medium">You own family groups</p>
                <div className="text-sm mt-1 flex flex-wrap gap-2">
                  {ownedGroups.map((g, i) => (
                    <Badge key={g.id} variant="outline" className="bg-white">{g.name}</Badge>
                  ))}
                </div>
              </AlertDescription>
            </div>
            <Link href="/family-sharing">
              <Button size="sm" variant="outline" className="ml-4">
                Manage <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </Alert>
      )}
    </div>
  );
}
