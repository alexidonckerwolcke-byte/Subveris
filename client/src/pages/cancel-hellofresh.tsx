import { useState } from "react";
import { Link } from "wouter";
import { AuthModal } from "@/components/auth-modal";

const steps = [
  {
    title: "Step 1: Log in and go to plan settings",
    description:
      "Visit the HelloFresh website or open the mobile app and sign in. Then open your name or profile icon, choose Plan Settings or Account Settings, and select the specific meal plan you want to stop.",
  },
  {
    title: "Step 2: Deactivate your account",
    description:
      "Scroll to the bottom of the Plan Settings page, look for the status section, and click Cancel Plan or Deactivate My Account. Follow the prompts, skip optional offers, and continue until you reach the final confirmation screen.",
  },
  {
    title: "Step 3: Verify the confirmation email",
    description:
      "After the cancellation is processed, HelloFresh will send a confirmation email. Keep it for your records so you have proof that your subscription has been stopped.",
  },
];

const reasons = [
  "The regular subscription price becomes too high once promotional discounts expire.",
  "It is difficult to use up all the ingredients before they go bad.",
  "You are going on vacation or your weekly schedule changes.",
  "You want to try competing food boxes or go back to grocery shopping.",
];

const outcomes = [
  "You can keep your current plan active until the next scheduled delivery window closes.",
  "You must cancel before the 11:59 PM PST cutoff five days before your next box.",
  "You will avoid further weekly charges once the cancellation is confirmed.",
  "You regain control of your household food budget and recurring expenses.",
];

export default function CancelHelloFreshPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_35%),linear-gradient(135deg,_#f8fffc_0%,_#f3f7f9_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_35%),linear-gradient(135deg,_#07140f_0%,_#0f172a_100%)] dark:text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-emerald-500/20 bg-white/80 p-8 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-emerald-400/20 dark:bg-slate-900/70">
          <div className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Weekly subscription guide
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            How to Cancel HelloFresh in 3 Simple Steps
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Whether you want a break, are traveling, or simply want to cut costs, canceling HelloFresh is straightforward as long as you act before the weekly cutoff.
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
              <h2 className="text-2xl font-semibold tracking-tight">Why do so many people cancel HelloFresh?</h2>
              <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                HelloFresh is convenient, but many customers decide to cancel for practical reasons.
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
              <h2 className="text-xl font-semibold tracking-tight">What happens after you cancel?</h2>
              <ul className="mt-4 space-y-3 pl-5 text-slate-600 dark:text-slate-300">
                {outcomes.map((item) => (
                  <li key={item} className="list-disc leading-7">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[24px] border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-cyan-50 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] dark:from-emerald-500/10 dark:to-cyan-500/10">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Keep track of weekly and monthly subscriptions
              </h2>
              <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                Weekly subscriptions can drain your account fast when you forget about them. Subveris helps you see everything clearly in one dashboard.
              </p>
            </section>
          </aside>
        </div>

        <section className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-500 to-cyan-600 p-8 text-white shadow-[0_25px_90px_-35px_rgba(5,150,105,0.6)]">
          <h2 className="text-3xl font-semibold tracking-tight">Keep track of weekly and monthly subscriptions</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-emerald-50">
            Weekly subscriptions like HelloFresh can drain your bank account quickly if you forget about them. Subveris gives you a single dashboard to manage recurring payments.
          </p>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-emerald-50">
            Take back control of your finances. Start using Subveris for free today and make sure your subscriptions work for you, not against you.
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
