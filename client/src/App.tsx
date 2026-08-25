import { Switch, Route, Link } from "wouter";
import { useState, useEffect, lazy, Suspense } from "react";
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

const NotFound = lazy(() => import("./pages/not-found.js"));
const Dashboard = lazy(() => import("./pages/dashboard.js"));
const Subscriptions = lazy(() => import("./pages/subscriptions.js"));
const DetectedSubscriptions = lazy(() => import("./pages/detected-subscriptions.js"));
const Insights = lazy(() => import("./pages/insights.js"));
const CostOptimizer = lazy(() => import("./pages/cost-optimizer.js"));
const Savings = lazy(() => import("./pages/savings.js"));
const Settings = lazy(() => import("./pages/settings.js"));
const Pricing = lazy(() => import("./pages/pricing.js"));
const Support = lazy(() => import("./pages/support.js"));
const Files = lazy(() => import("./pages/files.js"));
const HomePage = lazy(() => import("./pages/home.js"));
const Privacy = lazy(() => import("./pages/privacy.js"));
const Cookies = lazy(() => import("./pages/cookies.js"));
const CancelNetflixPage = lazy(() => import("./pages/cancel-netflix.js"));
const CancelAmazonPrimePage = lazy(() => import("./pages/cancel-amazon-prime.js"));
const CancelSpotifyPage = lazy(() => import("./pages/cancel-spotify.js"));
const CancelAdobePage = lazy(() => import("./pages/cancel-adobe.js"));
const CancelHelloFreshPage = lazy(() => import("./pages/cancel-hellofresh.js"));
const CancelDisneyPlusPage = lazy(() => import("./pages/cancel-disney-plus.js"));
const CancelYouTubePremiumPage = lazy(() => import("./pages/cancel-youtube-premium.js"));
const CancelICloudPage = lazy(() => import("./pages/cancel-icloud.js"));
const CancelXboxGamePassPage = lazy(() => import("./pages/cancel-xbox-game-pass.js"));
const CancelPlayStationPlusPage = lazy(() => import("./pages/cancel-playstation-plus.js"));
const CancelHBOMaxPage = lazy(() => import("./pages/cancel-hbo-max.js"));
const CancelViaplayPage = lazy(() => import("./pages/cancel-viaplay.js"));
const CancelTinderGoldPage = lazy(() => import("./pages/cancel-tinder-gold.js"));
const CancelDuolingoPage = lazy(() => import("./pages/cancel-duolingo.js"));
const CancelMicrosoft365Page = lazy(() => import("./pages/cancel-microsoft-365.js"));
const CancelCanvaProPage = lazy(() => import("./pages/cancel-canva-pro.js"));
const CancelLinkedInPremiumPage = lazy(() => import("./pages/cancel-linkedin-premium.js"));
const CancelNordVPNPage = lazy(() => import("./pages/cancel-nordvpn.js"));
const CancelAudiblePage = lazy(() => import("./pages/cancel-audible.js"));
const CancelReadlyPage = lazy(() => import("./pages/cancel-readly.js"));
const CancelCustomPage = lazy(() => import("./pages/cancel-custom.js"));
const Terms = lazy(() => import("./pages/terms.js"));
const Security = lazy(() => import("./pages/security.js"));
const AuthCallback = lazy(() => import("./pages/auth-callback.js"));
const FamilyCalendar = lazy(() => import("./pages/family-calendar.js"));
const Calendar = lazy(() => import("./pages/calendar.js"));
const FamilySharingPage = lazy(() => import("./pages/family-sharing.js"));
const DocsPage = lazy(() => import("./pages/docs.js"));
const ContactPage = lazy(async () => {
  const mod = await import("./pages/contact.js");
  return { default: mod.ContactPage };
});

function Router({ user }: { user: any }) {
  const authRoutes = [
    <Route key="dashboard" path="/" component={Dashboard} />,
    <Route key="dashboard-alt" path="/dashboard" component={Dashboard} />,
    <Route key="subscriptions" path="/subscriptions" component={Subscriptions} />,
    <Route key="detected-subscriptions" path="/detected-subscriptions" component={DetectedSubscriptions} />,
    <Route key="insights" path="/insights" component={Insights} />,
    <Route key="cost-optimizer" path="/cost-optimizer" component={CostOptimizer} />,
    <Route key="savings" path="/savings" component={Savings} />,
    <Route key="calendar" path="/calendar" component={Calendar} />,
    <Route key="family-sharing" path="/family-sharing" component={FamilySharingPage} />,
    <Route key="family-calendar" path="/family-calendar" component={FamilyCalendar} />,
    <Route key="settings" path="/settings" component={Settings} />,
    <Route key="pricing" path="/pricing" component={Pricing} />,
    <Route key="privacy" path="/privacy" component={Privacy} />,
    <Route key="cookies" path="/cookies" component={Cookies} />,
    <Route key="terms" path="/terms" component={Terms} />,
    <Route key="security" path="/security" component={Security} />,
    <Route key="contact" path="/contact" component={ContactPage} />,
    <Route key="docs" path="/docs" component={DocsPage} />,
    <Route key="cancel-netflix" path="/cancel-netflix" component={CancelNetflixPage} />,
    <Route key="cancel-amazon-prime" path="/cancel-amazon-prime" component={CancelAmazonPrimePage} />,
    <Route key="cancel-spotify" path="/cancel-spotify" component={CancelSpotifyPage} />,
    <Route key="cancel-adobe" path="/cancel-adobe" component={CancelAdobePage} />,
    <Route key="cancel-hellofresh" path="/cancel-hellofresh" component={CancelHelloFreshPage} />,
    <Route key="cancel-disney-plus" path="/cancel-disney-plus" component={CancelDisneyPlusPage} />,
    <Route key="cancel-youtube-premium" path="/cancel-youtube-premium" component={CancelYouTubePremiumPage} />,
    <Route key="cancel-icloud" path="/cancel-icloud" component={CancelICloudPage} />,
    <Route key="cancel-xbox-game-pass" path="/cancel-xbox-game-pass" component={CancelXboxGamePassPage} />,
    <Route key="cancel-playstation-plus" path="/cancel-playstation-plus" component={CancelPlayStationPlusPage} />,
    <Route key="cancel-hbo-max" path="/cancel-hbo-max" component={CancelHBOMaxPage} />,
    <Route key="cancel-viaplay" path="/cancel-viaplay" component={CancelViaplayPage} />,
    <Route key="cancel-tinder-gold" path="/cancel-tinder-gold" component={CancelTinderGoldPage} />,
    <Route key="cancel-duolingo" path="/cancel-duolingo" component={CancelDuolingoPage} />,
    <Route key="cancel-microsoft-365" path="/cancel-microsoft-365" component={CancelMicrosoft365Page} />,
    <Route key="cancel-canva-pro" path="/cancel-canva-pro" component={CancelCanvaProPage} />,
    <Route key="cancel-linkedin-premium" path="/cancel-linkedin-premium" component={CancelLinkedInPremiumPage} />,
    <Route key="cancel-nordvpn" path="/cancel-nordvpn" component={CancelNordVPNPage} />,
    <Route key="cancel-audible" path="/cancel-audible" component={CancelAudiblePage} />,
    <Route key="cancel-readly" path="/cancel-readly" component={CancelReadlyPage} />,
    <Route key="cancel-custom" path="/cancel-custom" component={CancelCustomPage} />,
    <Route key="support" path="/support" component={Support} />,
    <Route key="files" path="/files" component={Files} />,
    <Route key="auth-callback" path="/auth/callback" component={AuthCallback} />,
    <Route key="auth-callback-trailing" path="/auth/callback/" component={AuthCallback} />,
    <Route key="not-found" path="*" component={NotFound} />,
  ];

  const publicRoutes = [
    <Route key="home" path="/" component={HomePage} />,
    <Route key="privacy" path="/privacy" component={Privacy} />,
    <Route key="cookies" path="/cookies" component={Cookies} />,
    <Route key="terms" path="/terms" component={Terms} />,
    <Route key="security" path="/security" component={Security} />,
    <Route key="contact" path="/contact" component={ContactPage} />,
    <Route key="docs" path="/docs" component={DocsPage} />,
    <Route key="cancel-netflix" path="/cancel-netflix" component={CancelNetflixPage} />,
    <Route key="cancel-amazon-prime" path="/cancel-amazon-prime" component={CancelAmazonPrimePage} />,
    <Route key="cancel-spotify" path="/cancel-spotify" component={CancelSpotifyPage} />,
    <Route key="cancel-adobe" path="/cancel-adobe" component={CancelAdobePage} />,
    <Route key="cancel-hellofresh" path="/cancel-hellofresh" component={CancelHelloFreshPage} />,
    <Route key="cancel-disney-plus" path="/cancel-disney-plus" component={CancelDisneyPlusPage} />,
    <Route key="cancel-youtube-premium" path="/cancel-youtube-premium" component={CancelYouTubePremiumPage} />,
    <Route key="cancel-icloud" path="/cancel-icloud" component={CancelICloudPage} />,
    <Route key="cancel-xbox-game-pass" path="/cancel-xbox-game-pass" component={CancelXboxGamePassPage} />,
    <Route key="cancel-playstation-plus" path="/cancel-playstation-plus" component={CancelPlayStationPlusPage} />,
    <Route key="cancel-hbo-max" path="/cancel-hbo-max" component={CancelHBOMaxPage} />,
    <Route key="cancel-viaplay" path="/cancel-viaplay" component={CancelViaplayPage} />,
    <Route key="cancel-tinder-gold" path="/cancel-tinder-gold" component={CancelTinderGoldPage} />,
    <Route key="cancel-duolingo" path="/cancel-duolingo" component={CancelDuolingoPage} />,
    <Route key="cancel-microsoft-365" path="/cancel-microsoft-365" component={CancelMicrosoft365Page} />,
    <Route key="cancel-canva-pro" path="/cancel-canva-pro" component={CancelCanvaProPage} />,
    <Route key="cancel-linkedin-premium" path="/cancel-linkedin-premium" component={CancelLinkedInPremiumPage} />,
    <Route key="cancel-nordvpn" path="/cancel-nordvpn" component={CancelNordVPNPage} />,
    <Route key="cancel-audible" path="/cancel-audible" component={CancelAudiblePage} />,
    <Route key="cancel-readly" path="/cancel-readly" component={CancelReadlyPage} />,
    <Route key="cancel-custom" path="/cancel-custom" component={CancelCustomPage} />,
    <Route key="auth-callback" path="/auth/callback" component={AuthCallback} />,
    <Route key="auth-callback-trailing" path="/auth/callback/" component={AuthCallback} />,
    <Route key="not-found" path="*" component={NotFound} />,
  ];

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
      <Switch>{user ? authRoutes : publicRoutes}</Switch>
    </Suspense>
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
              <div className="flex min-w-0 flex-col flex-1 overflow-hidden">
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
                <main className="relative min-w-0 flex-1 overflow-auto">
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
