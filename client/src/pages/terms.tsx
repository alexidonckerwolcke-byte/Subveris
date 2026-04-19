import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-10 text-white shadow-2xl ring-1 ring-white/10">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Terms of Service</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Legal terms for using Subveris</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          These terms describe how Subveris operates, what is expected from you, and how we protect your account,
          data, and subscription experience.
        </p>
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300 shadow-lg shadow-slate-950/20">
          Effective date: December 25, 2025
        </div>
      </div>

      <div className="mt-10 grid gap-6">
        <Card className="border border-border/80 shadow-xl">
          <CardHeader className="bg-background/80">
            <div>
              <CardTitle>Core obligations</CardTitle>
              <CardDescription>How Subveris expects users to engage with the service.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Acceptance of Terms</h2>
              <p className="mt-3 text-muted-foreground">
                By using Subveris, you agree to these Terms of Service. Please read them carefully prior to using our platform.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Use of the Service</h2>
              <p className="mt-3 text-muted-foreground">
                Subveris is built for personal subscription tracking and premium optimization. You must provide accurate information
                and act in compliance with applicable laws.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Account Responsibility</h2>
              <p className="mt-3 text-muted-foreground">
                You are responsible for keeping your account credentials secure and for all activity that occurs under your account.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Data and Privacy</h2>
              <p className="mt-3 text-muted-foreground">
                We handle your data in accordance with our Privacy Policy. Use of Subveris constitutes consent to our data practices.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Premium Subscriptions</h2>
              <p className="mt-3 text-muted-foreground">
                Premium purchases are processed through Stripe. Premium access renews automatically unless canceled before the next billing cycle.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Limitation of Liability</h2>
              <p className="mt-3 text-muted-foreground">
                Subveris is provided "as is" and we are not liable for indirect, incidental, or consequential damages arising from use of the service.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Contact</h2>
              <p className="mt-3 text-muted-foreground">
                Questions about these terms may be directed to <a href="mailto:help.subveris@gmail.com" className="font-medium text-primary underline">help.subveris@gmail.com</a>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
