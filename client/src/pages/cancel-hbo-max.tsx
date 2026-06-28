import { useState } from "react";
import { Link } from "wouter";
import { AuthModal } from "@/components/auth-modal";
import { AlertCircle } from "lucide-react";

export default function CancelHBOMaxPage() {
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
            How to cancel HBO Max
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Thinking about ditching HBO Max after binge-watching your favorite series, or just trying to cut back on monthly expenses? Here's what you need to know before you cancel.
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
                <h2 className="text-xl font-semibold text-red-900 dark:text-red-200">Provider Bundle Trap</h2>
                <p className="mt-2 text-base leading-8 text-red-800 dark:text-red-300">
                  Since the Discovery+ merger, many accounts were moved to pricier tiers. If you signed up through a TV or internet provider like Vodafone or Ziggo, clicking Cancel on the HBO Max website does nothing. Your billing is managed by your provider, so you must cancel through their portal or the charges will keep rolling in.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-2xl font-semibold tracking-tight">How to cancel via desktop browser</h2>
            <ol className="mt-5 space-y-3 pl-5 text-slate-600 dark:text-slate-300">
              <li className="list-decimal leading-7">Go to <strong>HBOMax.com</strong> and sign in to your account.</li>
              <li className="list-decimal leading-7">Click your <strong>Profile icon</strong> in the top-right corner.</li>
              <li className="list-decimal leading-7">Select <strong>Settings</strong> (the gear icon) and then click <strong>Subscription</strong>.</li>
              <li className="list-decimal leading-7">Click <strong>Manage Subscription</strong>. If you don't see this, you are billed through a third party; check your bank statement to see which provider is charging you.</li>
              <li className="list-decimal leading-7">Click <strong>Cancel Subscription</strong> and confirm your choice.</li>
            </ol>
          </section>

          <section className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-2xl font-semibold tracking-tight">How to cancel via mobile devices</h2>
            <div className="mt-5 space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">iOS (iPhone/iPad)</h3>
                <p className="mt-2 text-base leading-8 text-slate-600 dark:text-slate-300">
                  Open <strong>Settings</strong> → Tap your name → <strong>Subscriptions</strong> → Choose <strong>HBO Max</strong> → Tap <strong>Cancel Subscription</strong>.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Android</h3>
                <p className="mt-2 text-base leading-8 text-slate-600 dark:text-slate-300">
                  Open <strong>Google Play Store</strong> → Tap your profile icon → <strong>Payments & subscriptions</strong> → <strong>Subscriptions</strong> → Select <strong>HBO Max</strong> → Tap <strong>Cancel subscription</strong>.
                </p>
              </div>
            </div>
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
