import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AFFILIATE_TRACKING_DISABLED_EVENT,
  AFFILIATE_TRACKING_DISABLED_KEY,
  clearAffiliateVisitorToken,
  isAffiliateTrackingEnabled,
} from "@/lib/affiliate-referral-storage";

function AffiliateReferralStorageControl() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isAffiliateTrackingEnabled());
  }, []);

  const updatePreference = (nextEnabled: boolean) => {
    if (nextEnabled) {
      window.localStorage.removeItem(AFFILIATE_TRACKING_DISABLED_KEY);
    } else {
      window.localStorage.setItem(AFFILIATE_TRACKING_DISABLED_KEY, "true");
      clearAffiliateVisitorToken();
      window.dispatchEvent(new Event(AFFILIATE_TRACKING_DISABLED_EVENT));
    }
    setEnabled(nextEnabled);
  };

  return (
    <div className="mt-4 flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">Referral tracking is {enabled ? "on" : "off"} for this browser.</p>
      <Button type="button" variant="outline" onClick={() => updatePreference(!enabled)}>
        {enabled ? "Turn off referral tracking" : "Turn on referral tracking"}
      </Button>
    </div>
  );
}

export default function Cookies() {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-10 text-white shadow-2xl ring-1 ring-white/10">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Cookie Policy</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Cookies and browser storage</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          This policy explains the cookies and browser storage used by Subveris in plain language.
        </p>
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300 shadow-lg shadow-slate-950/20">
          Last updated: November 10, 2026
        </div>
      </div>

      <div className="mt-10 grid gap-6">
        <Card className="border border-border/80 shadow-xl">
          <CardHeader>
            <CardTitle>How browser storage works</CardTitle>
            <CardDescription>
              Cookies are small pieces of data that a website can store in your browser. Browser storage provides similar local storage for websites and extensions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">What Subveris currently uses</h2>
              <p className="mt-3 text-muted-foreground">
                The current application uses Supabase Auth session storage in the browser, local and session storage for application state and security-session values, and browser extension storage for the extension session, plan status, tracking queue, and detected subscription data. When referral tracking is on, opening a creator link stores a first-party opaque visitor token for up to 30 days. Referral tracking is on by default and can be turned off below. The extension can also inspect existing browser cookies for supported services when its authenticated cookie scan runs.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Essential storage</h2>
              <p className="mt-3 text-muted-foreground">
                These items support login, session handling, CSRF protection, preferences, and core operation. They are necessary for the requested service and do not require consent under the usual GDPR cookie rules.
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li><strong>Supabase Auth storage:</strong> keeps the authentication session available to the web app. The exact storage key is managed by the Supabase client configuration and may vary by client version.</li>
                <li><strong>Application local storage:</strong> stores values such as the cached authentication token, user ID, preferences, and application state.</li>
                <li><strong>Application session storage:</strong> stores the extension/session identifiers and CSRF values used for protected API requests during the browser session.</li>
                <li><strong>Extension storage:</strong> stores the extension session token, authenticated user ID, plan status, expiration information, usage queue, and detected subscription data.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Functional storage</h2>
              <p className="mt-3 text-muted-foreground">
                Subveris uses browser and extension storage to remember preferences and maintain the state needed for features you request. These values are not used by the current code for advertising. They are part of the application or extension experience rather than a separate optional analytics system.
              </p>
              <p className="mt-3 text-muted-foreground">
                Referral tracking uses browser storage when you open a creator link. It is enabled by default on this browser, and you can turn it off below. The legal basis and any consent requirements for this default-on behavior must be reviewed for each applicable jurisdiction before live rollout.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Analytics and marketing</h2>
              <p className="mt-3 text-muted-foreground">
                No Google Analytics, Hotjar, Meta Pixel, advertising network, or retargeting pixel is used. Affiliate attribution is a separate, first-party referral feature. It starts automatically when you open a creator referral link while tracking is on; it is not used for advertising or cross-site tracking.
              </p>
              <p className="mt-3 text-muted-foreground">
                When referral tracking is on, Subveris records the referral code, click time, expiry, and a hash of a random browser token. No IP address, device fingerprint, or user-agent identifier is stored for referral attribution. If you later register or sign in, the eligible referral can be attached to your account for commission calculation. The creator sees only an anonymized referral reference, not your account email, password, or payment details. You can turn off tracking below; this clears the browser token and prevents future referral capture on this browser.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Third parties</h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li><strong>Supabase:</strong> provides authentication and database-backed application services. See the <a className="text-primary underline" href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Supabase Privacy Policy</a>.</li>
                <li><strong>Google:</strong> is contacted only when you authorize Gmail scanning through OAuth. The extension then uses the Gmail API to search and read matching messages. See the <a className="text-primary underline" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>.</li>
                <li><strong>Stripe:</strong> processes payment and subscription billing. Stripe payment pages may use their own technologies under Stripe&apos;s terms. See the <a className="text-primary underline" href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe Privacy Center</a>.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Duration</h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
                <li>Application-owned local A/B event and cron log records are pruned after 30 days.</li>
                <li>Application session values last for the browser/session lifetime or until the application clears them; the exact Supabase Auth session lifetime is controlled by Supabase project settings.</li>
                <li>The referral visitor token expires after the configured attribution window (initially 30 days). Its server-side hash is cleared after attribution or during retention cleanup after expiry. Click records are retained for up to 24 months for program reporting.</li>
                <li>Extension session storage is kept until the extension session expires, the user logs out, storage is cleared, or the extension is removed. The server-issued expiry is stored with the session.</li>
                <li>Third-party cookies or storage, including those used on Stripe-hosted payment pages, follow the applicable provider&apos;s policy and settings.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Referral tracking settings</h2>
              <p className="mt-3 text-muted-foreground">
                Referral tracking starts automatically when you open a creator link while it is on. You can turn it off here without affecting other Subveris features. Turning it off clears the local token and stops future referral capture on this browser. A referral attribution already attached to an account may remain in financial records needed to explain commissions, subject to applicable deletion and accounting requirements.
              </p>
              <AffiliateReferralStorageControl />
              <p className="mt-3 text-muted-foreground">
                You can withdraw Gmail access in Settings by disconnecting Gmail. You can clear application storage by signing out or using your browser&apos;s site-data controls, and you can clear extension storage by removing the extension or clearing its stored data.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Managing cookies and storage</h2>
              <p className="mt-3 text-muted-foreground">
                You can view, block, and delete cookies and site data through your browser settings. Browser instructions are available for <a className="text-primary underline" href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a>, <a className="text-primary underline" href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer">Edge</a>, <a className="text-primary underline" href="https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer">Firefox</a>, and <a className="text-primary underline" href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a>.
              </p>
              <p className="mt-3 text-muted-foreground">
                Blocking essential storage may prevent Subveris login or core features from working. Clearing extension storage will sign the extension out and remove its locally cached tracking state; data already synchronized to your Subveris account is handled under the Privacy Policy.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Questions</h2>
              <p className="mt-3 text-muted-foreground">
                Questions about cookies or browser storage can be sent to <a className="font-medium text-primary underline" href="mailto:help.subveris@gmail.com">help.subveris@gmail.com</a>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
