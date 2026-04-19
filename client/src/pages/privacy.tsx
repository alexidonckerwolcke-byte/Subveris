import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-10 text-white shadow-2xl ring-1 ring-white/10">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Privacy Policy</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">How Subveris protects your data</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          We design our service to keep your information secure, encrypted, and used only in ways that help you manage subscriptions.
          This page explains what we collect, why we collect it, and how we safeguard it.
        </p>
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300 shadow-lg shadow-slate-950/20">
          Effective date: December 25, 2025
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
              <h2 className="text-lg font-semibold">Introduction</h2>
              <p className="mt-3 text-muted-foreground">
                Subveris values your privacy. This policy explains what information we collect, how we use it, and how we store it safely.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Data We Collect</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground list-disc pl-6">
                <li>Account information such as name and email when you sign up.</li>
                <li>Subscription details you enter and usage tracking from our browser extension.</li>
                <li>Billing and payment information for Premium purchases processed through Stripe.</li>
                <li>Usage analytics and product insights to improve the service.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold">How We Use Your Data</h2>
              <p className="mt-3 text-muted-foreground">
                We use data to deliver and improve Subveris, provide insights, track subscriptions, and process payments.
                We do not sell your personal data to third parties.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Third-Party Services</h2>
              <p className="mt-3 text-muted-foreground">
                We use Stripe to process payments and Supabase to store your content. Our browser extension tracks usage anonymously,
                and third-party services operate under their own privacy terms.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">How We Store Data</h2>
              <p className="mt-3 text-muted-foreground">
                Your data is stored in Supabase (Postgres). Sensitive credentials are kept in server-side environment variables and
                never exposed to the browser. Access is restricted to authorized systems only.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Security</h2>
              <p className="mt-3 text-muted-foreground">
                We use TLS for data in transit and encryption best practices for stored data. We follow least-privilege access policies internally.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Your Rights</h2>
              <p className="mt-3 text-muted-foreground">
                You can request access, correction, or deletion of your personal data by contacting us at <a href="mailto:help.subveris@gmail.com" className="font-medium text-primary underline">help.subveris@gmail.com</a>.
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
