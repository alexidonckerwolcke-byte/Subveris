import { Switch, Route, Link } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SubscriptionProvider } from "@/lib/subscription-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { PostSignupFlow } from "@/components/post-signup-flow";
import { MFAChallengeModal } from "@/components/mfa-challenge-modal";
import { Button } from "@/components/ui/button";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Subscriptions from "@/pages/subscriptions";
import Insights from "@/pages/insights";
import Savings from "@/pages/savings";
import Settings from "@/pages/settings";
import Pricing from "@/pages/pricing";
import Support from "@/pages/support";
import Files from "@/pages/files";
import HomePage from "@/pages/home";
import Privacy from "@/pages/privacy";
import AuthCallback from "@/pages/auth-callback";
import FamilyCalendar from "@/pages/family-calendar";
import Calendar from "@/pages/calendar";
import FamilySharingPage from "@/pages/family-sharing";
import DocsPage from "@/pages/docs";
import { ContactPage } from "@/pages/contact";
import { useLocation } from "wouter";
import { CurrencyProvider } from "@/lib/currency-context";
import { CurrencySelector } from "@/components/currency-selector";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React from "react";

function Router({ user }: { user: any }) {
  if (!user) {
    return (
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/docs" component={DocsPage} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/insights" component={Insights} />
      <Route path="/savings" component={Savings} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/family-sharing" component={FamilySharingPage} />
      <Route path="/family-calendar" component={FamilyCalendar} />
      <Route path="/settings" component={Settings} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/support" component={Support} />
      <Route path="/files" component={Files} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route component={NotFound} />
    </Switch>
  );
}


function AppContent() {
  // Call ALL hooks unconditionally at the top level
  const [location] = useLocation();
  const { user, loading, signOut, justSignedUp, clearSignUpFlag, pendingMfaSession } = useAuth();
  const { hasSelectedCurrency } = useCurrency();
  const [postSignupOpen, setPostSignupOpen] = useState(false);

  useEffect(() => {
    // Show flow if just signed up OR if user is logged in but hasn't selected a currency yet
    if (user && (justSignedUp || !hasSelectedCurrency)) {
      setPostSignupOpen(true);
    }
  }, [justSignedUp, user, hasSelectedCurrency]);

  // Standalone docs page: render only DocsPage, no app shell
  if (location === "/docs") {
    return <DocsPage />;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router user={user} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (pendingMfaSession) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="text-white text-center">
          <p className="text-lg">Verifying your identity...</p>
        </div>
      </div>
    );
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar disabled={!user} />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex h-14 items-center justify-between gap-4 border-b border-border/70 bg-surface/80 backdrop-blur-md px-4 shrink-0 shadow-sm">
                  <SidebarTrigger data-testid="button-sidebar-toggle" disabled={!user} />
                  <div className="flex items-center gap-3">
                    <CurrencySelector />
                    <ThemeToggle />
                    {/* Profile dropdown */}
                    {user ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent">
                            <Avatar className="h-8 w-8">
                              {user?.user_metadata?.avatar_url ? (
                                <AvatarImage src={user.user_metadata.avatar_url} alt={user.email} />
                              ) : (
                                <AvatarFallback>{(user.email || "U").charAt(0).toUpperCase()}</AvatarFallback>
                              )}
                            </Avatar>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <div className="px-3 py-2">
                            <div className="text-sm font-semibold">{user.email}</div>
                          </div>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/settings">Account Settings</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href="/subscriptions">My Subscriptions</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={(e: any) => { e.preventDefault(); signOut(); }}>
                            Sign out
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => {}}>
                        Sign In
                      </Button>
                    )}
                  </div>
                </header>
                <main className="flex-1 overflow-auto relative">
                  <Router user={user} />
                  <OnboardingTutorial />
                  <PostSignupFlow
                    open={postSignupOpen}
                    onClose={() => {
                      setPostSignupOpen(false);
                      clearSignUpFlag();
                    }}
                  />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <MFAChallengeModal
            open={Boolean(pendingMfaSession)}
            onOpenChange={() => {}}
            onVerifySuccess={() => {
              window.location.reload();
            }}
          />
          <Toaster />
        </TooltipProvider>
      </SubscriptionProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CurrencyProvider>
          <AppContent />
        </CurrencyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
