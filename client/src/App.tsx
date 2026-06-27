import { Switch, Route, Link } from "wouter";
import { useState, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip.js";
import { SidebarProvider, SidebarTrigger } from "./components/ui/sidebar.js";
import { AppSidebar } from "./components/app-sidebar.js";
import { ThemeToggle } from "./components/theme-toggle.js";
import { SubscriptionProvider } from "./lib/subscription-context.js";
import { AuthProvider, useAuth } from "./lib/auth-context.js";
import { OnboardingTutorial } from "./components/onboarding-tutorial.js";
import { PostSignupFlow } from "./components/post-signup-flow.js";
import { MFAChallengeModal } from "./components/mfa-challenge-modal.js";
import { Button } from "./components/ui/button.js";
import NotFound from "./pages/not-found.js";
import Dashboard from "./pages/dashboard.js";
import Subscriptions from "./pages/subscriptions.js";
import Insights from "./pages/insights.js";
import Savings from "./pages/savings.js";
import Settings from "./pages/settings.js";
import Pricing from "./pages/pricing.js";
import Support from "./pages/support.js";
import Files from "./pages/files.js";
import HomePage from "./pages/home.js";
import Privacy from "./pages/privacy.js";
import CancelNetflixPage from "./pages/cancel-netflix.js";
import CancelAmazonPrimePage from "./pages/cancel-amazon-prime.js";
import CancelSpotifyPage from "./pages/cancel-spotify.js";
import CancelAdobePage from "./pages/cancel-adobe.js";
import CancelHelloFreshPage from "./pages/cancel-hellofresh.js";
import CancelDisneyPlusPage from "./pages/cancel-disney-plus.js";
import Terms from "./pages/terms.js";
import Security from "./pages/security.js";
import AuthCallback from "./pages/auth-callback.js";
import FamilyCalendar from "./pages/family-calendar.js";
import Calendar from "./pages/calendar.js";
import FamilySharingPage from "./pages/family-sharing.js";
import DocsPage from "./pages/docs.js";
import { ContactPage } from "./pages/contact.js";
import { useLocation } from "wouter";
import { CurrencyProvider } from "./lib/currency-context.js";
import { ErrorBoundary } from "./components/error-boundary.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./components/ui/dropdown-menu.js";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar.js";
import React from "react";

function Router({ user }: { user: any }) {
  if (!user) {
    return (
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/security" component={Security} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/docs" component={DocsPage} />
        <Route path="/cancel-netflix" component={CancelNetflixPage} />
        <Route path="/cancel-amazon-prime" component={CancelAmazonPrimePage} />
        <Route path="/cancel-spotify" component={CancelSpotifyPage} />
        <Route path="/cancel-adobe" component={CancelAdobePage} />
        <Route path="/cancel-hellofresh" component={CancelHelloFreshPage} />
        <Route path="/cancel-disney-plus" component={CancelDisneyPlusPage} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/auth/callback/" component={AuthCallback} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/insights" component={Insights} />
      <Route path="/savings" component={Savings} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/family-sharing" component={FamilySharingPage} />
      <Route path="/family-calendar" component={FamilyCalendar} />
      <Route path="/settings" component={Settings} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/security" component={Security} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/cancel-netflix" component={CancelNetflixPage} />
      <Route path="/cancel-amazon-prime" component={CancelAmazonPrimePage} />
      <Route path="/cancel-spotify" component={CancelSpotifyPage} />
      <Route path="/cancel-adobe" component={CancelAdobePage} />
      <Route path="/cancel-hellofresh" component={CancelHelloFreshPage} />
      <Route path="/cancel-disney-plus" component={CancelDisneyPlusPage} />
      <Route path="/support" component={Support} />
      <Route path="/files" component={Files} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/auth/callback/" component={AuthCallback} />
      <Route component={NotFound} />
    </Switch>
  );
}


function AppContent() {
  // Call ALL hooks unconditionally at the top level
  const [location] = useLocation();
  const { user, loading, signOut, justSignedUp, clearSignUpFlag, pendingMfaSession, isLoggingOut } = useAuth();
  const [postSignupOpen, setPostSignupOpen] = useState(false);
  const [postSignupCompleted, setPostSignupCompleted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPostSignupCompleted(localStorage.getItem('postSignupFlowCompleted') === 'true');
  }, []);

  useEffect(() => {
    // Show flow only once for users who have just signed up and haven't completed it yet.
    if (user && justSignedUp && !postSignupCompleted && location !== '/pricing') {
      setPostSignupOpen(true);
    }
  }, [justSignedUp, user, postSignupCompleted, location]);

  // Standalone docs page: render only DocsPage, no app shell
  if (location === "/docs") {
    return <DocsPage />;
  }

  // Show blank page during logout to prevent 404 from appearing
  if (isLoggingOut) {
    return <div className="min-h-screen bg-background" />;
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
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('postSignupFlowCompleted', 'true');
                      }
                      setPostSignupCompleted(true);
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
