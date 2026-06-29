import { useState } from "react";
import { Link } from "wouter";
import { AuthModal } from "@/components/auth-modal";
import { AlertCircle } from "lucide-react";

export default function CancelReadlyPage() {
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
            How to cancel Readly
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            If your digital magazine stack is gathering virtual dust, it's time to stop your monthly Readly subscription and clean up your banking statements.
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
                <h2 className="text-xl font-semibold text-red-900 dark:text-red-200">The 24-Hour Cutoff</h2>
                <p className="mt-2 text-base leading-8 text-red-800 dark:text-red-300">
                  Readly enforces a strict cancellation deadline: you must cancel your subscription at least 24 hours before your next scheduled renewal date. Because it's an app people easily forget about after reading a few specific issues, always check your inbox for an official cancellation receipt email immediately after going through the steps. If you don't receive that email, the system might not have registered it, locking you into another paid month.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-2xl font-semibold tracking-tight">How to cancel via desktop browser</h2>
            <ol className="mt-5 space-y-3 pl-5 text-slate-600 dark:text-slate-300">
              <li className="list-decimal leading-7">Log into your account on <strong>Readly.com</strong>.</li>
              <li className="list-decimal leading-7">Open your personal profile menu in the top right corner and click on <strong>My Account</strong>.</li>
              <li className="list-decimal leading-7">Click on the <strong>Subscription</strong> section tab.</li>
              <li className="list-decimal leading-7">Click the <strong>Cancel</strong> button and click through the confirmation prompts until the status changes to "Cancelled".</li>
            </ol>
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
