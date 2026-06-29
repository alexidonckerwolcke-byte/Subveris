import { useState } from "react";
import { Link } from "wouter";
import { AuthModal } from "@/components/auth-modal";
import { AlertCircle } from "lucide-react";

export default function CancelAudiblePage() {
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
            How to cancel Audible
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Ready to take a break from audiobooks, or did your unlistened backlog grow way too big? Cancelling your Amazon Audible membership is easy enough, but you need to act strategically before hitting that button.
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
                <h2 className="text-xl font-semibold text-red-900 dark:text-red-200">Use Your Credits or Lose Them</h2>
                <p className="mt-2 text-base leading-8 text-red-800 dark:text-red-300">
                  Be incredibly careful: the moment you cancel your Audible membership, any unused audiobook credits you've accumulated disappear forever. Amazon will not carry them over and will not refund them. Go through your account right now and spend every single open credit on audiobooks. Books purchased with credits remain yours to keep and listen to forever inside the app, even after your paid subscription is completely dead.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
            <h2 className="text-2xl font-semibold tracking-tight">How to cancel via desktop browser</h2>
            <ol className="mt-5 space-y-3 pl-5 text-slate-600 dark:text-slate-300">
              <li className="list-decimal leading-7">Go to <strong>Audible.com</strong> (or your local marketplace like Audible.co.uk/.nl) and log in.</li>
              <li className="list-decimal leading-7">Hover over your name at the top of the homepage and click <strong>Account Details</strong>.</li>
              <li className="list-decimal leading-7">Look under the <strong>Membership details</strong> section and click the <strong>Cancel membership</strong> link at the bottom.</li>
              <li className="list-decimal leading-7">Select a reason for leaving, click through the offer pages, and finalize by clicking <strong>Finish Cancellation</strong>.</li>
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
