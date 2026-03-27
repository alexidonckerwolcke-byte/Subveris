import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { FamilyPlanGate } from "@/components/family-plan-gate";
import { FamilySharing } from "@/components/family-sharing";

export default function FamilySharingPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [showDowngradeMsg, setShowDowngradeMsg] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1] ?? "");
    const downgrade = searchParams.get("downgrade");

    if (downgrade === "1" || sessionStorage.getItem("downgradeRedirect") === "1") {
      setShowDowngradeMsg(true);
      sessionStorage.removeItem("downgradeRedirect");
      toast({
        title: "Action Required",
        description: "You need to delete your family group before you can downgrade.",
        variant: "destructive",
      });
    }
  }, [location, toast]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Family Sharing</h2>
          <p className="text-muted-foreground">Share subscriptions with family members and manage costs</p>
        </div>
      </div>
      {showDowngradeMsg && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded">
          You need to delete your family group before you can downgrade your plan.
        </div>
      )}
      <FamilyPlanGate feature="Family Sharing" showBlurred={false}>
        <FamilySharing />
      </FamilyPlanGate>
    </div>
  );
}

