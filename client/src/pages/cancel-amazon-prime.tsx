import { useState } from "react";
import { Link } from "wouter";
import { AuthModal } from "@/components/auth-modal";
import { usePageMeta } from "@/lib/usePageMeta";
import { pickMetaVariant, reportAbConversion } from "@/lib/abMeta";
import { CancelRelatedGuides, CancelPageFaq, CancelPageJsonLd, getProductWhyCopy, getProductSidebarCopy, getProductIntro, getProductBadge } from "@/components/cancel-page-helpers";

const steps = [
  {
    title: "Step 1: Sign in to your Amazon account",
    description:
      "Log in to your Amazon account using the email address associated with your Prime membership. Then open Your Account and select Prime Membership to view your current plan, renewal date, and included benefits.",
  },
  {
    title: "Step 2: Manage your membership",
    description:
      "Choose Manage Membership and then End Membership or Cancel Membership. Amazon may remind you about the benefits you will lose and ask you to confirm your decision before the cancellation is finalized.",
  },
  {
    title: "Step 3: Confirm the cancellation",
    description:
      "Once the process is complete, Amazon will send a confirmation email. You can also revisit the Prime Membership page to verify that automatic renewal has been turned off.",
  },
];

const afterCancellation = [
  "You'll continue to enjoy Prime benefits until the end of your current billing period.",
  "Your membership won't renew automatically.",
  "Once your membership expires, you'll lose access to Prime Video, Prime Gaming, Prime Reading, Amazon Music Prime, and free Prime shipping.",
  "In some cases, you may be eligible for a full or partial refund depending on Amazon's policies.",
];

const reasons = [
  "The free trial has ended.",
  "You don't shop on Amazon as often anymore.",
  "You rarely use Prime Video or other included services.",
  "You're looking to reduce monthly expenses.",
  "You only signed up for a seasonal promotion or special event.",
];

export default function CancelAmazonPrimePage() {
          const meta = pickMetaVariant("cancel-amazon-prime", {
            title: "How to cancel Amazon Prime membership: stop renewals | Subveris",
            description: "Cancel Amazon Prime membership step by step, keep your benefits until renewal, and stop surprise Prime charges before the next billing date.",
            keywords: "how to cancel Amazon Prime, cancel Amazon Prime membership, stop Amazon Prime recurring payment, Amazon Prime cancellation guide",
            canonical: "https://subveris.com/cancel-amazon-prime",
            image: "https://subveris.com/assets/logo.png?v=3",
            author: "Subveris",
            type: "guide",
            publishedTime: "2024-01-01T00:00:00Z",
            modifiedTime: new Date().toISOString(),
          });
          usePageMeta(meta);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_35%),linear-gradient(135deg,_#f8fffc_0%,_#f3f7f9_100%)] text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_35%),linear-gradient(135deg,_#07140f_0%,_#0f172a_100%)] dark:text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-emerald-500/20 bg-white/80 p-8 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-emerald-400/20 dark:bg-slate-900/70">
          <div className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">{getProductBadge("Amazon Prime")}</div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            How to cancel Amazon Prime membership
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            If Prime is no longer worth the monthly fee, this guide walks you through canceling Amazon Prime and stopping future renewals.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                  try { reportAbConversion('cancel-amazon-prime', 'start-with-subveris'); } catch (e) {}
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
              <h2 className="text-2xl font-semibold tracking-tight">Why do so many people cancel Amazon Prime?</h2>
              <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                {getProductWhyCopy("Amazon Prime")}
              </p>
              <ul className="mt-5 space-y-3 pl-5 text-slate-600 dark:text-slate-300">
                {reasons.map((reason) => (
                  <li key={reason} className="list-disc leading-7">
                    {reason}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300">
                Because Prime renews automatically, many users continue paying for months without realizing it.
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
                Stop wasting money on forgotten subscriptions
              </h2>
              <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
                {getProductSidebarCopy("Amazon Prime")}
              </p>
            </section>
          </aside>
        </div>

        <CancelRelatedGuides current="/cancel-amazon-prime" />
        <CancelPageFaq productName="Amazon Prime" />
        <CancelPageJsonLd productName="Amazon Prime" url="https://subveris.com/cancel-amazon-prime" steps={steps} />

        <section className="rounded-[32px] border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-500 to-cyan-600 p-8 text-white shadow-[0_25px_90px_-35px_rgba(5,150,105,0.6)]">
          <h2 className="text-3xl font-semibold tracking-tight">Stop wasting money on forgotten subscriptions</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-emerald-50">
            Subveris helps you keep track of all your subscriptions in one place. You’ll get a clear overview of your recurring payments, making it easier to identify subscriptions you no longer use and save money.
          </p>
          <button
            type="button"
            onClick={() => {
              try { reportAbConversion('cancel-amazon-prime', 'create-account-hero'); } catch (e) {}
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
