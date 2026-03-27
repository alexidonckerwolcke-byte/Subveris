import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="container max-w-3xl py-12 px-6">
      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Effective date: December 25, 2025
          </p>

          <h3 className="font-semibold mt-4">1. Introduction</h3>
          <p className="mb-4">
            Subveris ("we", "us", "our") values your privacy. This Privacy Policy explains what information we collect,
            how we use it, and how we store it securely.
          </p>

          <h3 className="font-semibold mt-4">2. Data We Collect</h3>
          <ul className="list-disc ml-6 mb-4">
            <li>Account information (name, email) when you sign up.</li>
            <li>Subscription data you manually enter and usage tracking from our browser extension.</li>
            <li>Billing and subscription data via Stripe when you purchase Premium.</li>
            <li>Usage metrics and analytics to improve our service.</li>
          </ul>

          <h3 className="font-semibold mt-4">3. How We Use Your Data</h3>
          <p className="mb-4">
            We use data to provide and improve the service: to detect and track subscriptions, to show insights, and to
            process payments. We do not sell your personal data to third parties.
          </p>

          <h3 className="font-semibold mt-4">4. Third-Party Services</h3>
          <p className="mb-4">
            We use Stripe to process payments. Our browser extension tracks website usage anonymously. Stripe has its own privacy policy—please review it for details.
          </p>

          <h3 className="font-semibold mt-4">5. How We Store Data</h3>
          <p className="mb-4">
            We store your data in Supabase (Postgres). Sensitive credentials (API keys, webhook secrets) are stored in
            server-side environment variables and never exposed to the browser. Access to production databases is limited
            to authorized systems and personnel only.
          </p>

          <h3 className="font-semibold mt-4">6. Security</h3>
          <p className="mb-4">
            We use industry-standard security practices such as TLS for data in transit and encrypted secrets for sensitive
            configuration. We follow the principle of least privilege for internal access.
          </p>

          <h3 className="font-semibold mt-4">7. Your Rights</h3>
          <p className="mb-4">
            You can request access, correction, or deletion of your personal data by contacting us at help.subveris@gmail.com.
          </p>

          <h3 className="font-semibold mt-4">8. Contact</h3>
          <p className="mb-4">
            For privacy inquiries, email: <a href="mailto:help.subveris@gmail.com" className="underline">help.subveris@gmail.com</a>
          </p>

          <p className="text-sm text-muted-foreground">
            By using our service, you agree to the terms of this Privacy Policy. We may update this policy occasionally;
            changes will be posted here with an updated effective date.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
