import { useState } from "react";
import { Link } from "wouter";
import { AuthModal } from "@/components/auth-modal";

const steps = [
  {
    title: "Step 1: Check your plan and commitment",
    description:
      "Sign in to your Adobe account at adobe.com, open Manage Plan, and review your subscription type. If you chose an annual plan paid monthly, Adobe can charge 50% of the remaining contract value if you cancel early.",
  },
  {
    title: "Step 2: Use the plan switch trick to avoid fees",
    description:
      "If Adobe is trying to charge an early cancellation fee, switch to a cheaper plan such as Photography or a single app. After the change is processed, wait 24 hours and then cancel the new plan within its 14-day window to avoid the fee.",
  },
  {
    title: "Step 3: Confirm the cancellation",
    description:
      "After canceling, make sure Adobe sends a confirmation email. Log back into your account to verify that your status shows Canceled and that no further automatic payments are scheduled.",
  },
];

const reasons = [
  "The monthly cost is too high for casual or freelance use.",
  "They are switching to free or one-time-purchase alternatives like Figma, Canva, or DaVinci Resolve.",
  "They only needed the software for a short-term project.",
  "They were caught off guard by the automatic annual renewal.",
];

const benefits = [
  "You can keep your current plan until the end of the billing cycle.",
  "You can avoid or reduce early termination fees by switching plans first.",
  "You can cancel within the new plan's 14-day window without extra charges.",
  "You regain control over your software budget and recurring expenses.",
];

export default function CancelAdobePage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_35%),linear-gradient(135deg,_#f8fffc_0%,_#f3f7f9_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_35%),linear-gradient(135deg,_#07140f_0%,_#0f172a_100%)] dark:text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-emerald-500/20 bg-white/80 p-8 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-emerald-400/20 dark:bg-slate-900/70">
          <div className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Smart subscription guide
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            How to Cancel Adobe Creative Cloud Without Fees
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Adobe is known for annual contracts that can feel hard to escape. The good news is that there are practical ways to cancel and avoid or reduce early termination fees.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setAuthDefaultTab('signup');
                setAuthModalOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Start with Subveris
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back to home
            </Link>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.45fr_0.75fr]">
          <article className="space-y-6">
            {steps.map((step, index) => (
              <section
                key={step.title}
                className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  {index + 1}
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">{step.title}</h2>
                <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                  {step.description}
                </p>
              </section>
            ))}

            <section className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
              <h2 className="text-2xl font-semibold tracking-tight">Why do so many people cancel Adobe?</h2>
              <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                Adobe Creative Cloud is a powerful toolset, but many users eventually cancel because the subscription no longer matches their needs.
              </p>
              <ul className="mt-5 space-y-3 pl-5 text-slate-600 dark:text-slate-300">
                {reasons.map((reason) => (
                  <li key={reason} className="list-disc leading-7">
                    {reason}
                  </li>
                ))}
              </ul>
            </section>
          </article>

          <aside className="space-y-6">
            <section className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
              <h2 className="text-xl font-semibold tracking-tight">What you can expect after canceling</h2>
              <ul className="mt-4 space-y-3 pl-5 text-slate-600 dark:text-slate-300">
                {benefits.map((item) => (
                  <li key={item} className="list-disc leading-7">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[24px] border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-cyan-50 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] dark:from-emerald-500/10 dark:to-cyan-500/10">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Take control of your subscriptions
              </h2>
              <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                Software, streaming, cloud storage, and memberships can quietly cost far more than expected. Subveris helps you track them all in one place.
              </p>
            </section>
          </aside>
        </div>

        <section className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-500 to-cyan-600 p-8 text-white shadow-[0_25px_90px_-35px_rgba(5,150,105,0.6)]">
          <h2 className="text-3xl font-semibold tracking-tight">Take control of your subscriptions</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-emerald-50">
            Adobe Creative Cloud is a prime example of how modern subscriptions can quietly drain your wallet with hidden terms and automatic renewals. Subveris helps you manage all your recurring payments in one place.
          </p>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-emerald-50">
            Ready to stop wasting money? Start using Subveris for free today and never get surprised by a hidden subscription fee again.
          </p>
          <button
            type="button"
            onClick={() => {
              setAuthDefaultTab('signup');
              setAuthModalOpen(true);
            }}
            className="mt-7 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Create your free account
          </button>
        </section>
      </div>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultTab={authDefaultTab} />
    </main>
  );
}
