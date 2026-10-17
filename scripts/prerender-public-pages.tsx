import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { AuthProvider } from "../client/src/lib/auth-context";
import { CurrencyProvider } from "../client/src/lib/currency-context";
import { PageMetaCollectorContext, type PageMetaParams } from "../client/src/lib/usePageMeta";
import { SubscriptionProvider } from "../client/src/lib/subscription-context";
import { TooltipProvider } from "../client/src/components/ui/tooltip";
import HomePage from "../client/src/pages/home";
import PricingPage from "../client/src/pages/pricing";
import BestSubscriptionTrackersPage from "../client/src/pages/best-subscription-trackers";
import WhySubverisBestSubscriptionManagerPage from "../client/src/pages/why-subveris-best-subscription-manager";
import DocsPage from "../client/src/pages/docs";
import SupportPage from "../client/src/pages/support";
import { ContactPage } from "../client/src/pages/contact";
import PrivacyPage from "../client/src/pages/privacy";
import TermsPage from "../client/src/pages/terms";
import SecurityPage from "../client/src/pages/security";
import CancelAdobePage from "../client/src/pages/cancel-adobe";
import CancelAmazonPrimePage from "../client/src/pages/cancel-amazon-prime";
import CancelAudiblePage from "../client/src/pages/cancel-audible";
import CancelCanvaPage from "../client/src/pages/cancel-canva-pro";
import CancelDisneyPlusPage from "../client/src/pages/cancel-disney-plus";
import CancelDuolingoPage from "../client/src/pages/cancel-duolingo";
import CancelHBOMaxPage from "../client/src/pages/cancel-hbo-max";
import CancelHelloFreshPage from "../client/src/pages/cancel-hellofresh";
import CancelICloudPage from "../client/src/pages/cancel-icloud";
import CancelLinkedInPremiumPage from "../client/src/pages/cancel-linkedin-premium";
import CancelMicrosoft365Page from "../client/src/pages/cancel-microsoft-365";
import CancelNetflixPage from "../client/src/pages/cancel-netflix";
import CancelNordVPNPage from "../client/src/pages/cancel-nordvpn";
import CancelPlayStationPlusPage from "../client/src/pages/cancel-playstation-plus";
import CancelReadlyPage from "../client/src/pages/cancel-readly";
import CancelSpotifyPage from "../client/src/pages/cancel-spotify";
import CancelTinderGoldPage from "../client/src/pages/cancel-tinder-gold";
import CancelViaplayPage from "../client/src/pages/cancel-viaplay";
import CancelXboxGamePassPage from "../client/src/pages/cancel-xbox-game-pass";
import CancelYouTubePremiumPage from "../client/src/pages/cancel-youtube-premium";
import NotFoundPage from "../client/src/pages/not-found";

const publicPages = new Map<string, React.ComponentType>([
  ["/", HomePage],
  ["/pricing", PricingPage],
  ["/best-subscription-trackers", BestSubscriptionTrackersPage],
  ["/why-subveris-best-subscription-manager", WhySubverisBestSubscriptionManagerPage],
  ["/docs", DocsPage],
  ["/support", SupportPage],
  ["/contact", ContactPage],
  ["/privacy", PrivacyPage],
  ["/terms", TermsPage],
  ["/security", SecurityPage],
  ["/cancel-adobe", CancelAdobePage],
  ["/cancel-amazon-prime", CancelAmazonPrimePage],
  ["/cancel-audible", CancelAudiblePage],
  ["/cancel-canva-pro", CancelCanvaPage],
  ["/cancel-disney-plus", CancelDisneyPlusPage],
  ["/cancel-duolingo", CancelDuolingoPage],
  ["/cancel-hbo-max", CancelHBOMaxPage],
  ["/cancel-hellofresh", CancelHelloFreshPage],
  ["/cancel-icloud", CancelICloudPage],
  ["/cancel-linkedin-premium", CancelLinkedInPremiumPage],
  ["/cancel-microsoft-365", CancelMicrosoft365Page],
  ["/cancel-netflix", CancelNetflixPage],
  ["/cancel-nordvpn", CancelNordVPNPage],
  ["/cancel-playstation-plus", CancelPlayStationPlusPage],
  ["/cancel-readly", CancelReadlyPage],
  ["/cancel-spotify", CancelSpotifyPage],
  ["/cancel-tinder-gold", CancelTinderGoldPage],
  ["/cancel-viaplay", CancelViaplayPage],
  ["/cancel-xbox-game-pass", CancelXboxGamePassPage],
  ["/cancel-youtube-premium", CancelYouTubePremiumPage],
]);

function renderPage(path: string, Page: React.ComponentType) {
  let pageMeta: PageMetaParams | null = null;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const staticLocation = () => [path, () => {}] as const;

  const markup = renderToStaticMarkup(
    <Router hook={staticLocation}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CurrencyProvider>
            <SubscriptionProvider>
              <TooltipProvider>
                <PageMetaCollectorContext.Provider value={(meta) => { pageMeta = meta; }}>
                  <Page />
                </PageMetaCollectorContext.Provider>
              </TooltipProvider>
            </SubscriptionProvider>
          </CurrencyProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Router>,
  );

  return { markup, pageMeta };
}

export function getPublicPagePaths() {
  return [...publicPages.keys()];
}

export function renderPublicPage(path: string) {
  const Page = publicPages.get(path);
  if (!Page) throw new Error(`No prerender component registered for ${path}`);
  return renderPage(path, Page);
}

export function renderNotFound(path: string) {
  return renderPage(path, NotFoundPage);
}