import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard,
  TrendingUp,
  Bell,
  BarChart3,
  Shield,
  Users,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  features: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Subveris!",
    description: "Your personal subscription management assistant",
    icon: CheckCircle2,
    content: (
      <div className="text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <p className="text-lg">
          Subveris helps you track recurring bills, discover savings, and keep your family subscriptions organized.
        </p>
      </div>
    ),
    features: ["Subscription tracking", "Savings insights", "Family sharing"],
  },
  {
    title: "Dashboard Overview",
    description: "See your subscriptions at a glance",
    icon: BarChart3,
    content: (
      <div className="space-y-4">
        <p>The Dashboard shows what matters most first:</p>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">📊 Total monthly spending</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">⏰ Upcoming renewals and payment dates</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">💡 AI recommendations for savings</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🚫 Unused or inactive subscriptions</p>
          </div>
        </div>
      </div>
    ),
    features: ["Spend summary", "Renewal alerts", "Savings suggestions"],
  },
  {
    title: "Manage Subscriptions",
    description: "Add, edit, and organize your services",
    icon: CreditCard,
    content: (
      <div className="space-y-4">
        <p>Use the Subscriptions page to keep everything current:</p>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">➕ Add subscriptions manually</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">📝 Edit payment amounts and renewal dates</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🔍 Filter by category or status</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🗑️ Remove services you no longer use</p>
          </div>
        </div>
      </div>
    ),
    features: ["Add / edit subscriptions", "Renewal tracking", "Category filters"],
  },
  {
    title: "Insights & Savings",
    description: "Find hidden savings and cost-per-use data",
    icon: TrendingUp,
    content: (
      <div className="space-y-4">
        <p>The Insights page highlights where you can save:</p>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">💰 Potential savings from unused services</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">📉 Cost-per-use analysis for each subscription</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">📊 Spending trends by month and category</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🤖 AI suggestions for better plans</p>
          </div>
        </div>
      </div>
    ),
    features: ["Savings opportunities", "Cost-per-use", "Spending trends"],
  },
  {
    title: "Family Sharing",
    description: "Share subscriptions and manage family costs",
    icon: Users,
    content: (
      <div className="space-y-4">
        <p>If you upgrade to Family, you can:</p>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">👥 Invite family members</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">📑 Share subscriptions across the group</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">💳 See combined family spending</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">⚖️ Manage who sees shared data</p>
          </div>
        </div>
      </div>
    ),
    features: ["Family group management", "Shared subscriptions", "Shared spending"],
  },
  {
    title: "Settings & Security",
    description: "Control your preferences and protect your account",
    icon: Shield,
    content: (
      <div className="space-y-4">
        <p>In Settings, you can:</p>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🌍 Change your display currency</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🔐 Enable two-factor authentication</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">📘 Retake the onboarding tutorial anytime</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🧾 Manage account preferences and profile info</p>
          </div>
        </div>
      </div>
    ),
    features: ["Currency settings", "2FA security", "Tutorial retake"],
  },
];

export function OnboardingTutorial() {
  const { isNewUser, tutorialCompleted, completeTutorial, justSignedUp } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Show tutorial for new users who haven't completed it yet, or just signed up
  useEffect(() => {
    if ((isNewUser || justSignedUp) && !tutorialCompleted) {
      setIsOpen(true);
    }
  }, [isNewUser, justSignedUp, tutorialCompleted]);

  // Also show tutorial if user wants to retake it (check URL param or localStorage flag)
  useEffect(() => {
    const shouldShowTutorial = localStorage.getItem('showTutorial') === 'true';
    if (shouldShowTutorial) {
      setIsOpen(true);
      localStorage.removeItem('showTutorial');
    }
  }, []);

  if (tutorialCompleted && !isOpen) {
    return null;
  }

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    completeTutorial();
    setIsOpen(false);
  };

  const handleSkip = () => {
    completeTutorial();
    setIsOpen(false);
  };

  const step = tutorialSteps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{step.title}</DialogTitle>
                <DialogDescription>{step.description}</DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="py-6">
          {step.content}
          {step.features.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Key Features:</h4>
              <div className="flex flex-wrap gap-2">
                {step.features.map((feature, index) => (
                  <Badge key={index} variant="secondary">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              size="sm"
            >
              Skip Tutorial
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <div className="flex gap-1 mx-4">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full ${
                    index === currentStep
                      ? "bg-primary"
                      : index < currentStep
                      ? "bg-primary/50"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <Button onClick={handleNext} size="sm">
              {currentStep === tutorialSteps.length - 1 ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}