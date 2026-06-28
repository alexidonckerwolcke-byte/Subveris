import { useState } from "react";
import { Link } from "wouter";
import { AuthModal } from "@/components/auth-modal";

const steps = [
  {
    title: "Step 1: Open iCloud settings",
    description:
      "On your iPhone or iPad, open the Settings app, tap your name at the top, and select iCloud.",
  },
  {
    title: "Step 2: Manage your storage plan",
    description:
      "Tap Manage Account Storage or Manage Storage, then choose Change Storage Plan.",
  },
  {
    title: "Step 3: Downgrade to free",
    description:
      "Select Downgrade Options, enter your Apple ID password, and choose the 5GB Free plan to cancel your paid subscription. Your plan will switch at the end of the billing cycle.",
  },
];

const reasons = [
  "They moved their files to a hard drive or Google Drive.",
  "They optimized their device storage and no longer need extra space.",
  "They want to cut down on recurring monthly fees.",
];

const afterCancellation = [
  "Your plan will switch to the free tier at the end of the current billing cycle.",
  "You can still access your existing iCloud data until the change takes effect.",
  "You can upgrade again later if you need more storage.",
];

export default function CancelICloudPage() {
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
            How to cancel iCloud Plus Storage in 3 simple steps
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            If you cleaned up your iPhone storage or want to move to a different cloud provider, downgrading or canceling iCloud+ is quick and easy from your Apple device.
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
              <h2 className="text-2xl font-semibold tracking-tight">Why do people cancel iCloud+?</h2>
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
              <h2 className="text-xl font-semibold tracking-tight">What happens after downgrading?</h2>
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
                Keep track of every digital bill
              </h2>
              <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                Cloud storage, software, streaming, and email plans can quietly stack up. Subveris gives you one clear view of your recurring spending.
              </p>
            </section>
          </aside>
        </div>

        <section className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-500 to-cyan-600 p-8 text-white shadow-[0_25px_90px_-35px_rgba(5,150,105,0.6)]">
          <h2 className="text-3xl font-semibold tracking-tight">Stop paying for forgotten subscriptions</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-emerald-50">
            Subveris helps you keep cloud, streaming, and software subscriptions visible in one place. Start using Subveris for free today and stay in control of your monthly spending.
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
