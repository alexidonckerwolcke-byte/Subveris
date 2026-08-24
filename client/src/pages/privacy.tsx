import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-10 text-white shadow-2xl ring-1 ring-white/10">
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
        <Card className="border border-border/80 shadow-xl">
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
                The data controller is <strong>[INSERT YOUR LEGAL NAME OR COMPANY NAME]</strong>, trading as Subveris.
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
                <li>Technical and security data such as IP address, request timestamps, browser type, device information, approximate location inferred from IP where available, error logs, and authentication/session identifiers.</li>
                <li>Cookies and similar technologies used for authentication, security, preferences, and service operation.</li>
                <li>Usage analytics and product insights to improve the service.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Legal Bases</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-6">
                <li><strong>Contract performance:</strong> to create and maintain your account, provide subscription tracking and analytics, synchronize extension data, and deliver features you request.</li>
                <li><strong>Consent:</strong> to scan Gmail, send optional marketing or product communications, and use any optional non-essential analytics or cookies. You can withdraw consent at any time without affecting earlier lawful processing.</li>
                <li><strong>Legitimate interests:</strong> to secure the service, prevent abuse, troubleshoot errors, understand feature performance, and improve Subveris, balanced against your privacy rights.</li>
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
                <li>Full extension tracking is enabled for authenticated Premium or Household tier users. Free tier users see a notice that full tracking is paused, although previously synced account data may remain until deleted.</li>
                <li>You can export or delete all your data at any time via your account settings.</li>
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
                <li>Subveris personnel and contractors only where access is necessary to operate, support, secure, or improve the service.</li>
                <li><strong>Supabase:</strong> authentication, database hosting, backups, and hosted API infrastructure.</li>
                <li><strong>Stripe:</strong> payment processing, customer records, invoices, and subscription billing. Stripe receives the payment and billing information required to process your purchase.</li>
                <li><strong>Google:</strong> Gmail API access only when you authorize Gmail scanning through OAuth.</li>
                <li>Other service providers may process data only under written instructions and confidentiality obligations. We do not sell personal data.</li>
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
                <li>Account and subscription information is kept while your account is active and deleted within 30 days after account deletion, except where a longer period is required by law or needed to resolve disputes.</li>
                <li>Browser-extension usage records are kept while your account is active and deleted with your account unless you request earlier deletion.</li>
                <li>Gmail OAuth tokens are kept only while Gmail scanning is enabled and are deleted when you disconnect Gmail or delete your account. Extracted subscription details follow the account retention period; full email content is not retained by Subveris.</li>
                <li>Security and server logs, including IP addresses, are retained for up to 30 days unless needed longer to investigate a security incident or comply with law.</li>
                <li>Encrypted backups may retain deleted data for up to 90 days before automatic overwrite. Stripe and Google may retain information under their own policies and legal obligations.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">International Transfers</h2>
              <p className="mt-3 text-muted-foreground">
                Supabase, Stripe, Google, and other providers may process data outside the European Economic Area, including in the United States.
                Where required, we use an adequacy decision, the European Commission&apos;s Standard Contractual Clauses, or another lawful transfer mechanism,
                together with appropriate technical and contractual safeguards. You can request more information about applicable safeguards by contacting us.
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
                and we will explain any extension. You can also export or delete available account data through account settings.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Cookies and Similar Technologies</h2>
              <p className="mt-3 text-muted-foreground">
                Subveris uses strictly necessary cookies or browser storage for authentication, session security, CSRF protection, preferences, and keeping you signed in.
                The browser extension uses extension storage for its session token, plan status, and tracking queue. We may use optional analytics technologies only after obtaining consent where required.
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
              By using Subveris, you agree to the terms of this Privacy Policy. We may update this policy occasionally and post the
              revised effective date here.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
