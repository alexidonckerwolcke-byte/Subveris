import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, Zap } from "lucide-react";

interface HealthScore {
  score: number;
  status: "Poor" | "Moderate" | "Good" | "Excellent";
  emoji: string;
  message: string;
  yearlyWaste: number;
  estimatedSavings: number;
  tooManySubscriptions?: boolean;
  maxAnalyzedSubscriptions?: number;
}

export function SubscriptionHealthScore() {
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealthScore = async () => {
      try {
        const response = await fetch("/api/health-score");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        const data = await response.json();
        setHealthScore(data);
      } catch (err) {
        console.error("Error fetching health score:", err);
        setError(err instanceof Error ? err.message : "Could not load health score");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHealthScore();
  }, []);

  if (isLoading) {
    return (
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle>Subscription Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-16 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error || !healthScore) {
    return (
      <Card className="border-2 border-red-200">
        <CardHeader>
          <CardTitle>Subscription Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm">{error || "Could not load health score"}</p>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = () => {
    if (healthScore.score >= 80) return "text-green-600";
    if (healthScore.score >= 60) return "text-yellow-600";
    if (healthScore.score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getStatusColor = () => {
    if (healthScore.status === "Excellent") return "bg-green-100 text-green-800";
    if (healthScore.status === "Good") return "bg-blue-100 text-blue-800";
    if (healthScore.status === "Moderate") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Subscription Health Score</CardTitle>
        <CardDescription>See how optimized your subscriptions are</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Display */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-4">
              <div className="text-6xl font-bold">
                <span className={getScoreColor()}>{healthScore.score}</span>
                <span className="text-gray-400 text-4xl">/100</span>
              </div>
              <div className="text-4xl">{healthScore.emoji}</div>
            </div>
            <div className={`inline-block mt-4 px-4 py-2 rounded-full font-semibold ${getStatusColor()}`}>
              {healthScore.status} Optimization
            </div>
          </div>
        </div>

        {/* Message */}
        <p className="text-gray-700 font-medium">{healthScore.message}</p>

        {/* Penalty Breakdown */}
        <div className="bg-white rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-sm text-gray-700">Optimization Factors:</h3>
          <ul className="text-sm space-y-1 text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
              Unused subscriptions impact your score
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
              High cost-per-use needs attention
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              Declining usage suggests cancellation opportunities
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              Inactive subscriptions reduce your score
            </li>
          </ul>
        </div>

        {/* Waste Estimate (Premium Only or Blurred) */}
        {healthScore.tooManySubscriptions ? (
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <p className="font-semibold text-blue-900">Premium Feature</p>
            </div>
            <p className="text-sm text-blue-800 mb-3">
              You have {healthScore.maxAnalyzedSubscriptions || 3}+ subscriptions. Upgrade to see:
            </p>
            <ul className="text-sm text-blue-800 space-y-1 mb-4">
              <li>✓ Exact yearly waste calculation</li>
              <li>✓ Detailed breakdown per subscription</li>
              <li>✓ Personal improvement suggestions</li>
              <li>✓ Savings projections</li>
            </ul>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">Upgrade to Premium</Button>
          </div>
        ) : healthScore.yearlyWaste > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <p className="font-semibold text-amber-900">Estimated Impact</p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-amber-700">Yearly Waste</p>
                <p className="text-2xl font-bold text-amber-900">€{healthScore.yearlyWaste}</p>
              </div>
              <div>
                <p className="text-sm text-amber-700">Potential Savings</p>
                <p className="text-xl font-bold text-green-600">+€{healthScore.estimatedSavings}/year</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">
                Great job! Your subscriptions are well optimized.
              </p>
            </div>
          </div>
        )}

        {/* CTA Button */}
        {healthScore.score < 80 && (
          <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={() => window.location.href = '/insights'}>
              View Recommendations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
