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
    title: "Welcome to SubVeris!",
    description: "Your personal subscription management assistant",
    icon: CheckCircle2,
    content: (
      <div className="text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <p className="text-lg">
          Welcome! SubVeris helps you track, manage, and optimize all your subscriptions in one place.
        </p>
      </div>
    ),
    features: [],
  },
  {
    title: "Track Your Subscriptions",
    description: "Install our extension and start manual tracking",
    icon: CreditCard,
    content: (
      <div className="space-y-4">
        <p>SubVeris helps you track subscriptions through:</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span className="text-sm">Manual entry with presets</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="text-sm">Browser extension tracking</span>
          </div>
        </div>
      </div>
    ),
    features: ["Manual tracking", "Smart suggestions", "Extension monitoring"],
  },
  {
    title: "Save Money",
    description: "Identify unused subscriptions and potential savings",
    icon: TrendingUp,
    content: (
      <div className="space-y-4">
        <p>Get insights into your spending patterns and find opportunities to save:</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold">!</span>
            </div>
            <div>
              <p className="font-medium">Unused Subscriptions</p>
              <p className="text-sm text-muted-foreground">Cancel services you don't use</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium">Cost Optimization</p>
              <p className="text-sm text-muted-foreground">Find better deals and alternatives</p>
            </div>
          </div>
        </div>
      </div>
    ),
    features: ["Savings projections", "Cost analysis", "Smart recommendations"],
  },
  {
    title: "Smart Notifications",
    description: "Never miss a payment or renewal date",
    icon: Bell,
    content: (
      <div className="space-y-4">
        <p>Stay on top of your subscriptions with intelligent notifications:</p>
        <div className="space-y-2">
          <Badge className="bg-blue-100 text-blue-800">Payment reminders</Badge>
          <Badge className="bg-orange-100 text-orange-800">Renewal alerts</Badge>
          <Badge className="bg-green-100 text-green-800">Savings opportunities</Badge>
          <Badge className="bg-purple-100 text-purple-800">Usage tracking</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Get notified before payments are due and when you can save money.
        </p>
      </div>
    ),
    features: ["Payment reminders", "Renewal alerts", "Custom notifications"],
  },
  {
    title: "Detailed Analytics",
    description: "Understand your subscription spending patterns",
    icon: BarChart3,
    content: (
      <div className="space-y-4">
        <p>Visualize your subscription data with comprehensive analytics:</p>
        <div className="grid grid-cols-1 gap-3">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5" />
              <span className="font-medium">Spending Charts</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Monthly and yearly spending breakdowns by category
            </p>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">Usage Insights</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Track how much you use each service and its cost-effectiveness
            </p>
          </div>
        </div>
      </div>
    ),
    features: ["Spending analytics", "Category breakdowns", "Usage tracking"],
  },
  {
    title: "Secure & Private",
    description: "Your data is protected with enterprise-grade security",
    icon: Shield,
    content: (
      <div className="space-y-4">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto text-green-600 mb-4" />
        </div>
        <p>Your privacy and security are our top priorities:</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Enterprise-grade encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Secure data storage</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>No data sharing</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>GDPR compliant</span>
          </div>
        </div>
      </div>
    ),
    features: ["Enterprise security", "Data encryption", "Privacy protection"],
  },
  {
    title: "Dashboard",
    description: "Your central hub for subscription overview",
    icon: BarChart3,
    content: (
      <div className="space-y-4">
        <p>The Dashboard is your command center where you can see:</p>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">📊 Total spending summary</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">📈 Recent subscriptions</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">💡 AI recommendations</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Access it from the sidebar menu on the left
        </p>
      </div>
    ),
    features: ["Quick overview", "Key metrics", "Recent activity"],
  },
  {
    title: "Subscriptions Page",
    description: "Manage all your subscriptions",
    icon: CreditCard,
    content: (
      <div className="space-y-4">
        <p>Here you can:</p>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">➕ Add new subscriptions manually</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">📋 View all subscriptions organized by status</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🗑️ Delete subscriptions you no longer use</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🔍 Search and filter by category</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Click on "Subscriptions" in the sidebar to access this page
        </p>
      </div>
    ),
    features: ["Manage subscriptions", "Add/Delete items", "Filter & search"],
  },
  {
    title: "Insights Page",
    description: "Discover savings opportunities",
    icon: TrendingUp,
    content: (
      <div className="space-y-4">
        <p>Get actionable insights including:</p>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🎯 Unused subscriptions to cancel</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">💰 Potential monthly savings</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">📊 Spending patterns analysis</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🤖 AI-powered recommendations</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Find it under "Insights" in the sidebar menu
        </p>
      </div>
    ),
    features: ["Savings insights", "Usage analysis", "Smart recommendations"],
  },
  {
    title: "Settings Page",
    description: "Customize your account and preferences",
    icon: Shield,
    content: (
      <div className="space-y-4">
        <p>Manage your account settings:</p>
        <div className="space-y-3">
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">👤 Update profile information</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🔑 Change password</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🌙 Toggle dark mode</p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">🔐 Enable 2FA for security</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Access Settings from the sidebar at the bottom
        </p>
      </div>
    ),
    features: ["Profile settings", "Security options", "Preferences"],
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