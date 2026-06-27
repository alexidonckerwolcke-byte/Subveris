import { useState } from "react";
import { Link } from "wouter";
import { AuthModal } from "@/components/auth-modal";

const steps = [
  {
    title: "Step 1: Sign in to your Spotify account",
    description:
      "Go to the Spotify website and sign in to your account. Then click your profile picture in the top-right corner, choose Account, and open Your Plan to view your subscription details.",
  },
  {
    title: "Step 2: Cancel your Premium plan",
    description:
      "On the Your Plan page, click Change Plan, scroll to Cancel Premium, and follow the on-screen prompts. Spotify may offer alternate plans before asking you to confirm.",
  },
  {
    title: "Step 3: Check your confirmation",
    description:
      "After canceling, Spotify will email you a confirmation. Revisit the Your Plan page to confirm your account will switch to the free version when the current billing period ends.",
  },
];

const afterCancellation = [
  "You'll keep Premium features until the end of your current billing cycle.",
  "After that, your account automatically switches to Spotify Free.",
  "You'll still have access to your playlists, saved songs, and library.",
  "You'll lose Premium features like offline downloads, ad-free listening, unlimited skips, and high-quality audio.",
];

const reasons = [
  "Switching to another music streaming service.",
  "Joining a Family or Duo plan.",
  "Trying to reduce monthly subscription costs.",
  "Not listening to music often enough to justify the fee.",
  "Receiving Premium through another service or mobile provider.",
];

export default function CancelSpotifyPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_35%),linear-gradient(135deg,_#f8fffc_0%,_#f3f7f9_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_35%),linear-gradient(135deg,_#07140f_0%,_#0f172a_100%)] dark:text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-emerald-500/20 bg-white/80 p-8 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-emerald-400/20 dark:bg-slate-900/70">
          <div className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Subscription savings guide
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            How to Cancel Spotify Premium in 3 Simple Steps
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Not using your Spotify Premium subscription as much as you used to? Whether you've switched services, joined a family plan, or want to cut costs, canceling Spotify Premium is quick and easy.
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
              <h2 className="text-2xl font-semibold tracking-tight">Why do so many people cancel Spotify Premium?</h2>
              <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                Spotify Premium is one of the most popular music subscriptions worldwide, but many users decide to cancel for simple reasons.
              </p>
              <ul className="mt-5 space-y-3 pl-5 text-slate-600 dark:text-slate-300">
                {reasons.map((reason) => (
                  <li key={reason} className="list-disc leading-7">
                    {reason}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300">
                Even small monthly subscriptions can add up when combined with other recurring payments.
              </p>
            </section>
          </article>

          <aside className="space-y-6">
            <section className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
              <h2 className="text-xl font-semibold tracking-tight">What happens after you cancel?</h2>
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
                Keep track of every subscription 
              </h2>
              <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                Subscription tracking is the best way to avoid paying for services you no longer use. Subveris shows everything in one dashboard.
              </p>
            </section>
          </aside>
        </div>

        <section className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-500 to-cyan-600 p-8 text-white shadow-[0_25px_90px_-35px_rgba(5,150,105,0.6)]">
          <h2 className="text-3xl font-semibold tracking-tight">Keep track of all your subscriptions</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-emerald-50">
            Spotify Premium is just one of many services that can renew silently each month. Subveris helps you manage all your recurring payments in one place.
          </p>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-emerald-50">
            Start using Subveris for free today and take control of your subscriptions—so you never waste money on forgotten recurring payments again.
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
