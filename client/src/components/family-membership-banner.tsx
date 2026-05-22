import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Info, ChevronRight, X } from "lucide-react";
import { Link } from "wouter";
import type { FamilyGroup } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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
  const [ownerBannerHidden, setOwnerBannerHidden] = useState(false);
  const [memberBannerHidden, setMemberBannerHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ownerStored = window.localStorage.getItem("family-owner-banner-hidden");
    const memberStored = window.localStorage.getItem("family-member-banner-hidden");
    setOwnerBannerHidden(ownerStored === "true");
    setMemberBannerHidden(memberStored === "true");
  }, []);

  const { data: membershipData, isLoading } = useQuery<FamilyMembershipData, Error>({
    queryKey: ["/api/family-groups/me/membership"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/family-groups/me/membership');
      return response.json();
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
      {memberGroups.length > 0 && !memberBannerHidden && (
        <Alert className="border-blue-200 bg-blue-50 relative">
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
            <div className="flex items-center gap-2">
              <Link href="/family-sharing">
                <Button size="sm" variant="outline">
                  View <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full p-2"
                onClick={() => {
                  setMemberBannerHidden(true);
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("family-member-banner-hidden", "true");
                  }
                }}
                aria-label="Dismiss family member banner"
              >
                <X className="h-4 w-4 text-blue-600" />
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {/* Owner of family banner */}
      {ownedGroups.length > 0 && !ownerBannerHidden && (
        <Alert className="border-green-200 bg-green-50 relative">
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
            <div className="flex items-center gap-2">
              <Link href="/family-sharing">
                <Button size="sm" variant="outline">
                  Manage <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full p-2"
                onClick={() => {
                  setOwnerBannerHidden(true);
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("family-owner-banner-hidden", "true");
                  }
                }}
                aria-label="Dismiss family owner banner"
              >
                <X className="h-4 w-4 text-green-600" />
              </Button>
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
}
