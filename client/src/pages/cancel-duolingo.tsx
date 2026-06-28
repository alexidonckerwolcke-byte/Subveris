import { useState } from "react";
import { Link } from "wouter";
import { AuthModal } from "@/components/auth-modal";
import { AlertCircle } from "lucide-react";

export default function CancelDuolingoPage() {
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
            How to cancel Duolingo Plus and Super Duolingo
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Has the green owl overstayed its welcome, or are you just not using the premium features enough to justify the price? You can easily cancel Super Duolingo and drop back down to the standard tier.
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

        <div className="space-y-6">
          <section className="rounded-[24px] border border-red-500/30 bg-red-50/80 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-red-500/20 dark:bg-red-950/20">
            <div className="flex gap-4">
              <AlertCircle className="h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <h2 className="text-xl font-semibold text-red-900 dark:text-red-200">The Psychological Progress Threat</h2>
                <p className="mt-2 text-base leading-8 text-red-800 dark:text-red-300">
                  When you hit the cancel button, Duolingo deploys heavy psychological guilt-tripping tactics. They flash alarming warnings claiming you will lose your daily streak and entirely wipe out your hard-earned language progress. This is pure marketing psychology designed to scare you into maintaining your paid membership. Your language history, streaks, and data are 100% safe. Your account simply downgrades to the free, ad-supported tier once your current paid billing period runs out.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-2xl font-semibold tracking-tight">How to cancel via desktop browser</h2>
            <ol className="mt-5 space-y-3 pl-5 text-slate-600 dark:text-slate-300">
              <li className="list-decimal leading-7">Log into your account at <strong>Duolingo.com</strong>.</li>
              <li className="list-decimal leading-7">Click your <strong>Username</strong> in the sidebar and select <strong>Settings</strong>.</li>
              <li className="list-decimal leading-7">On the right-hand menu, click on <strong>Super Duolingo</strong> (or <strong>Duolingo Plus</strong>).</li>
              <li className="list-decimal leading-7">Click <strong>Cancel Subscription</strong> and click through the exit prompts to confirm.</li>
            </ol>
          </section>

          <section className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-2xl font-semibold tracking-tight">Your progress is always safe</h2>
            <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
              Canceling your premium subscription does not delete or reset your learning progress. You can access all your completed lessons, streaks, and language data anytime by logging back into your free Duolingo account.
            </p>
          </section>
        </div>

        <section className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-500 to-cyan-600 p-8 text-white shadow-[0_25px_90px_-35px_rgba(5,150,105,0.6)]">
          <h2 className="text-3xl font-semibold tracking-tight">Stop hidden charges before they happen</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-emerald-50">
            Tired of hidden charges and sneaky auto-renewals? Add your subscriptions to Subveris for free. Get an automatic alert before you get charged, so you never miss a cancellation deadline again.
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
