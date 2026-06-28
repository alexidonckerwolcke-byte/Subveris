import { useState } from "react";
import { Link } from "wouter";
import { AuthModal } from "@/components/auth-modal";

const steps = [
  {
    title: "Step 1: Open Services & subscriptions",
    description:
      "Log in to account.microsoft.com with your Xbox account details and navigate to the Services & subscriptions tab at the top.",
  },
  {
    title: "Step 2: Turn off recurring billing",
    description:
      "Find your Xbox Game Pass subscription, click Manage, and choose Cancel subscription or Turn off recurring billing. Follow the prompts to confirm.",
  },
  {
    title: "Step 3: Check expiration",
    description:
      "Review the final screen to verify your subscription will not renew. You can keep playing downloaded games until the current period ends.",
  },
];

const reasons = [
  "They completed the specific games they wanted to play.",
  "They don't have enough free time to justify the monthly fee.",
  "They want to switch back to buying individual games.",
];

const afterCancellation = [
  "Your subscription remains active until the end of the current billing period.",
  "No further Game Pass charges should appear after cancellation.",
  "You can restart a Game Pass membership later when you want to game again.",
];

export default function CancelXboxGamePassPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_35%),linear-gradient(135deg,_#f8fffc_0%,_#f3f7f9_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_35%),linear-gradient(135deg,_#07140f_0%,_#0f172a_100%)] dark:text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-emerald-500/20 bg-white/80 p-8 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-emerald-400/20 dark:bg-slate-900/70">
          <div className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Personal finance guide
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            How to cancel Xbox Game Pass in 3 simple steps
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Not gaming as much or want a break from Microsoft's subscription? Canceling Xbox Game Pass takes less than two minutes from your Microsoft account.
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
              <h2 className="text-2xl font-semibold tracking-tight">Why do people cancel Xbox Game Pass?</h2>
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
              <h2 className="text-xl font-semibold tracking-tight">What happens after cancellation?</h2>
              <ul className="mt-4 space-y-3 pl-5 text-slate-600 dark:text-slate-300">
                {afterCancellation.map((item) => (
                  <li key={item} className="list-disc leading-7">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[24px] border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-cyan-50 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] dark:from-emerald-500/10 dark:to-cyan-500/10">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Master your gaming budget
              </h2>
              <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                Gaming passes, streaming apps, and DLC subscriptions can add up fast. Subveris helps you see every recurring cost in one place.
              </p>
            </section>
          </aside>
        </div>

        <section className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-500 to-cyan-600 p-8 text-white shadow-[0_25px_90px_-35px_rgba(5,150,105,0.6)]">
          <h2 className="text-3xl font-semibold tracking-tight">Protect your bank account from automated renewals</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-emerald-50">
            Subveris gives you complete control over your subscription costs. Sign up for free and stop letting recurring gaming fees sneak past you.
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
