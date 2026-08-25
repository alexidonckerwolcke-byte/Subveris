import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="container mx-auto max-w-4xl min-w-0 px-4 py-10 sm:px-6 sm:py-16">
      <div className="min-w-0 rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 text-white shadow-2xl ring-1 ring-white/10 sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Privacy Policy</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">How Subveris protects your data</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          We use your information to identify subscription waste and provide optimization recommendations.
          This page explains what we collect, why we collect it, and the controls available to you.
        </p>
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300 shadow-lg shadow-slate-950/20">
          Effective date: August 20, 2026
        </div>
      </div>

      <div className="mt-10 grid gap-6">
        <Card className="min-w-0 border border-border/80 shadow-xl">
          <CardHeader className="bg-background/80">
            <div>
              <CardTitle>Trusted data handling</CardTitle>
              <CardDescription>Clear rules for collection, storage, and use of personal information.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Data Controller</h2>
              <p className="mt-3 text-muted-foreground">
                The data controller is <strong>Subveris</strong>.
                Our contact email is <a href="mailto:help.subveris@gmail.com" className="font-medium text-primary underline">help.subveris@gmail.com</a>.
                Our registered address is <strong>[INSERT YOUR REGISTERED BUSINESS ADDRESS]</strong>. Replace the bracketed details before publishing this policy.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Introduction</h2>
              <p className="mt-3 text-muted-foreground">
                Subveris values your privacy. This policy explains what information we collect, how we use it, and how we store it safely.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Data We Collect</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-6">
                <li>Account information such as name and email when you sign up.</li>
                <li>Subscription details you enter manually and automatically detected subscriptions from our browser extension (website visits, Gmail receipts, CSV imports, and authentication cookies).</li>
                <li>Usage data from our browser extension including time spent on subscription service websites and zero-usage patterns.</li>
                <li>Billing and payment information for Premium purchases processed through Stripe.</li>
                <li>Technical and security data generated when you use the service, such as IP address and request information in server logs, error logs, and authentication/session identifiers. We do not use this policy to claim collection of browser or device data that is not described elsewhere in the service.</li>
                <li>Cookies and similar technologies used for authentication, security, preferences, and service operation.</li>
                <li>Usage analytics and product insights to improve the service.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Legal Bases</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-6">
                <li><strong>Contract performance:</strong> to create and maintain your account, provide subscription tracking and analytics, synchronize extension data, and deliver features you request.</li>
                <li><strong>Consent:</strong> to scan Gmail after you authorize Google OAuth. You can withdraw that consent by disconnecting Gmail in Settings; this does not affect processing that occurred before withdrawal.</li>
                <li><strong>Legitimate interests:</strong> to secure the service, prevent abuse, troubleshoot errors, and improve Subveris, balanced against your privacy rights.</li>
                <li><strong>Legal obligation:</strong> to retain or disclose information where required by tax, accounting, fraud-prevention, court, or other applicable legal requirements.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">How We Use Your Data</h2>
              <p className="mt-3 text-muted-foreground">
                We use data to deliver and improve Subveris, provide insights, optimize recurring spend, and process payments.
                We do not sell your personal data. We may share the minimum data needed with service providers that operate Subveris,
                such as Supabase for database and authentication services and Stripe for payment processing.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Browser Extension Data Collection</h2>
              <p className="mt-3 text-muted-foreground font-medium">What the Extension Collects</p>
              <ul className="mt-2 space-y-2 text-muted-foreground list-disc pl-6">
                <li><strong>Website Visits:</strong> We track when you visit subscription service websites (Netflix, Spotify, Adobe, etc.) and measure time spent on each site to understand your usage patterns.</li>
                <li><strong>Authentication Cookies:</strong> On first login, the extension scans for authentication session cookies to identify which services you're logged into.</li>
                <li><strong>Gmail Receipts:</strong> With your permission via OAuth, we scan your Gmail inbox for subscription-related emails (receipts, invoices, renewals) and extract service names and amounts. This scan runs periodically and we retain only the extracted subscription information, not the full email content.</li>
                <li><strong>CSV Imports:</strong> The extension automatically detects subscription list CSV files in your Downloads folder and parses them to extract subscription data.</li>
              </ul>
              <p className="mt-4 text-muted-foreground font-medium">How We Use Extension Data</p>
              <p className="mt-2 text-muted-foreground">
                Extension data is used to: (1) automatically detect your subscriptions without manual entry, (2) track usage patterns across your subscription services, (3) identify unused or redundant subscriptions, and (4) provide recommendations for cost optimization. This data is synced to your Subveris account and subject to the same privacy protections as manually entered data.
              </p>
              <p className="mt-4 text-muted-foreground font-medium">Privacy & Control</p>
              <ul className="mt-2 space-y-2 text-muted-foreground list-disc pl-6">
                <li>Gmail scanning requires explicit OAuth authorization and can be disabled anytime in Settings → Connected Services.</li>
                <li>Deployed API requests use HTTPS. Database protection, backups, and encryption at rest depend on the Supabase project configuration and provider controls.</li>
                <li>Full extension tracking is enabled for authenticated Premium or Family plan users. Free tier users see a notice that full tracking is paused, although previously synced account data may remain until deleted.</li>
                <li>You can start an account export or deletion from account settings. The automated export currently includes your account fields, subscriptions, transactions, insights, plan record, notification preferences, family memberships, and calendar events. It does not include provider-held records or credentials.</li>
                <li>The account-deletion action removes application records for subscriptions, transactions, insights, billing-plan data, push subscriptions, notification preferences, family memberships, family-plan backups, family settings, owned family groups, and the public user record before deleting the Supabase Auth account. Contact us for records not covered by the automated action.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Third-Party Services</h2>
              <p className="mt-3 text-muted-foreground">
                We use Stripe to process payments and Supabase for authentication, database storage, and hosted API functions.
                Extension usage records are associated with your Subveris account rather than being anonymous. These providers process data
                under their own privacy terms.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Who Receives Your Data</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-6">
                <li>Subveris personnel only where access is necessary to operate, support, or secure the service.</li>
                <li><strong>Supabase:</strong> authentication, database hosting, backups, and hosted API infrastructure.</li>
                <li><strong>Stripe:</strong> payment processing, customer records, invoices, and subscription billing. Stripe receives the payment and billing information required to process your purchase.</li>
                <li><strong>Google:</strong> Gmail API access only when you authorize Gmail scanning through OAuth.</li>
                <li>We do not sell personal data. Any additional processor will be identified in an updated version of this policy where applicable.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">How We Store Data</h2>
              <p className="mt-3 text-muted-foreground">
                Your data is stored in Supabase Postgres. Stripe secret keys and Supabase service-role credentials are intended to remain
                in server-side environment variables and are not required by the browser. The extension stores its session token in browser
                extension storage so it can sync data, and that local storage should be protected by the browser account and device security.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Retention</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-6">
                <li>Account, subscription, and extension usage records are retained while your account is active. The account-deletion action removes the application-controlled records immediately; any temporary application copy under Subveris control is removed within 30 days, except where retention is required by law or necessary to resolve disputes.</li>
                <li>Gmail OAuth tokens are stored for Gmail scanning and are deleted when you disconnect Gmail or delete your account. Extracted subscription details remain subject to the account retention period; full email content is not intentionally stored by the current Gmail integration.</li>
                <li>Application-owned local cron logs and A/B event logs are pruned to retain no more than 30 days of entries. Supabase, hosting, and other provider-managed logs may have separate retention periods under their policies.</li>
                <li>Supabase, Stripe, and Google may retain information under their own policies and legal obligations. This policy does not claim a 30-day deletion period for provider-managed backups or logs.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">International Transfers</h2>
              <p className="mt-3 text-muted-foreground">
                Supabase, Stripe, Google, and other providers may process data outside the European Economic Area, including in the United States.
                The specific transfer mechanism and safeguards must be confirmed for each provider before publication. We will document an adequacy decision,
                the European Commission&apos;s Standard Contractual Clauses, or another lawful mechanism where it applies. You can request information about the applicable safeguards by contacting us.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Security</h2>
              <p className="mt-3 text-muted-foreground">
                We use HTTPS for deployed web and API traffic and rely on Supabase and Stripe security controls for hosted infrastructure.
                We use row-level security policies for user-owned database records where configured. No security system is infallible, so keep
                your account credentials private and report suspected unauthorized access promptly.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Your Rights</h2>
              <p className="mt-3 text-muted-foreground">
                Depending on applicable law, you may have the right to access your personal data, correct inaccurate data, request deletion,
                restrict processing, receive a portable copy, object to processing based on legitimate interests, and withdraw consent.
                You may also object to direct marketing at any time.
              </p>
              <p className="mt-3 text-muted-foreground">
                To exercise a right, email <a href="mailto:help.subveris@gmail.com" className="font-medium text-primary underline">help.subveris@gmail.com</a>
                from the address associated with your account and describe your request. We may ask for information needed to verify your identity.
                We will respond without undue delay and normally within one month. This period may be extended by up to two additional months for complex requests,
                and we will explain any extension. Account settings provide export and account-deletion actions, but the current automated export does not include every data category. Contact us for data not available through those actions.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Cookies and Similar Technologies</h2>
              <p className="mt-3 text-muted-foreground">
                Subveris uses strictly necessary cookies or browser storage for authentication, session security, CSRF protection, preferences, and keeping you signed in.
                The browser extension uses extension storage for its session token, plan status, and tracking queue. This policy does not state that optional analytics technologies are used.
                You can control cookies through your browser settings, but disabling necessary storage may prevent login or core features from working.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Complaints</h2>
              <p className="mt-3 text-muted-foreground">
                Contact us first so we can try to resolve your concern. You also have the right to lodge a complaint with the Belgian Data Protection Authority (GBA/APD):
                <a href="https://www.dataprotectionauthority.be" target="_blank" rel="noopener noreferrer" className="ml-1 font-medium text-primary underline">www.dataprotectionauthority.be</a>,
                Rue de la Presse 35, 1000 Brussels, Belgium, <a href="mailto:contact@apd-gba.be" className="ml-1 font-medium text-primary underline">contact@apd-gba.be</a>, +32 (0)2 274 48 00.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Changes to This Policy</h2>
              <p className="mt-3 text-muted-foreground">
                We may update this policy to reflect changes in the service, law, or our data practices. We will publish the revised policy here,
                update the effective date, and provide additional notice through the service or email when a change materially affects your rights.
              </p>
            </div>

            <div className="text-sm text-muted-foreground">
              This policy describes the current intended processing of personal data by Subveris. We may update this policy occasionally and post the
              revised effective date here.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
