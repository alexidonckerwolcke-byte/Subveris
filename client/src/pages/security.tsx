import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Security() {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-10 text-white shadow-2xl ring-1 ring-white/10">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Security</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Security standards for Subveris</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
          We prioritize strong protection across every layer of the service, from authentication to storage, monitoring, and incident response.
        </p>
      </div>

      <div className="mt-10 grid gap-6">
        <Card className="border border-border/80 shadow-xl">
          <CardHeader className="bg-background/80">
            <div>
              <CardTitle>Security posture</CardTitle>
              <CardDescription>Industry-standard controls to keep your account and data safe.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Data Encryption</h2>
              <p className="mt-3 text-muted-foreground">
                We use TLS to protect data in transit and secure storage practices for data at rest. Sensitive information is handled with encryption wherever possible.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Access Controls</h2>
              <p className="mt-3 text-muted-foreground">
                Production systems are restricted to authorized personnel only. We apply least-privilege access controls across our environments.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Authentication</h2>
              <p className="mt-3 text-muted-foreground">
                User accounts are protected by Supabase authentication. We recommend enabling any available multi-factor authentication options for added security.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Monitoring and Incident Response</h2>
              <p className="mt-3 text-muted-foreground">
                We monitor systems for suspicious behavior and have processes to investigate and respond to incidents quickly.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Reporting Security Issues</h2>
              <p className="mt-3 text-muted-foreground">
                If you discover a security vulnerability, please notify us immediately at <a href="mailto:help.subveris@gmail.com" className="font-medium text-primary underline">help.subveris@gmail.com</a>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
