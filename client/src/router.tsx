import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";

const NotFound = lazy(() => import("./pages/not-found.js"));
const Dashboard = lazy(() => import("./pages/dashboard.js"));
const Subscriptions = lazy(() => import("./pages/subscriptions.js"));
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

export function Router({ user }: { user: any }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <Switch>
        {user ? (
          <>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/subscriptions" component={Subscriptions} />
            <Route path="/insights" component={Insights} />
            <Route path="/cost-optimizer" component={CostOptimizer} />
            <Route path="/savings" component={Savings} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/family-sharing" component={FamilySharingPage} />
            <Route path="/family-calendar" component={FamilyCalendar} />
            <Route path="/settings" component={Settings} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/cookies" component={Cookies} />
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
            <Route path="/cancel-youtube-premium" component={CancelYouTubePremiumPage} />
            <Route path="/cancel-icloud" component={CancelICloudPage} />
            <Route path="/cancel-xbox-game-pass" component={CancelXboxGamePassPage} />
            <Route path="/cancel-playstation-plus" component={CancelPlayStationPlusPage} />
            <Route path="/cancel-hbo-max" component={CancelHBOMaxPage} />
            <Route path="/cancel-viaplay" component={CancelViaplayPage} />
            <Route path="/cancel-tinder-gold" component={CancelTinderGoldPage} />
            <Route path="/cancel-duolingo" component={CancelDuolingoPage} />
            <Route path="/cancel-microsoft-365" component={CancelMicrosoft365Page} />
            <Route path="/cancel-canva-pro" component={CancelCanvaProPage} />
            <Route path="/cancel-linkedin-premium" component={CancelLinkedInPremiumPage} />
            <Route path="/cancel-nordvpn" component={CancelNordVPNPage} />
            <Route path="/cancel-audible" component={CancelAudiblePage} />
            <Route path="/cancel-readly" component={CancelReadlyPage} />
            <Route path="/cancel-custom" component={CancelCustomPage} />
            <Route path="/auth/callback" component={AuthCallback} />
            <Route path="/auth/callback/" component={AuthCallback} />
            <Route component={NotFound} />
          </>
        ) : (
          <>
            <Route path="/" component={HomePage} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/cookies" component={Cookies} />
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
            <Route path="/cancel-youtube-premium" component={CancelYouTubePremiumPage} />
            <Route path="/cancel-icloud" component={CancelICloudPage} />
            <Route path="/cancel-xbox-game-pass" component={CancelXboxGamePassPage} />
            <Route path="/cancel-playstation-plus" component={CancelPlayStationPlusPage} />
            <Route path="/cancel-hbo-max" component={CancelHBOMaxPage} />
            <Route path="/cancel-viaplay" component={CancelViaplayPage} />
            <Route path="/cancel-tinder-gold" component={CancelTinderGoldPage} />
            <Route path="/cancel-duolingo" component={CancelDuolingoPage} />
            <Route path="/cancel-microsoft-365" component={CancelMicrosoft365Page} />
            <Route path="/cancel-canva-pro" component={CancelCanvaProPage} />
            <Route path="/cancel-linkedin-premium" component={CancelLinkedInPremiumPage} />
            <Route path="/cancel-nordvpn" component={CancelNordVPNPage} />
            <Route path="/cancel-audible" component={CancelAudiblePage} />
            <Route path="/cancel-readly" component={CancelReadlyPage} />
            <Route path="/cancel-custom" component={CancelCustomPage} />
            <Route path="/auth/callback" component={AuthCallback} />
            <Route path="/auth/callback/" component={AuthCallback} />
            <Route component={NotFound} />
          </>
        )}
      </Switch>
    </Suspense>
  );
}
