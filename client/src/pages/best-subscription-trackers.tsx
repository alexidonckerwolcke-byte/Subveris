import { Link } from "wouter";
import { usePageMeta } from "@/lib/usePageMeta";
import { Button } from "@/components/ui/button";
import { cancelPages } from "@/components/cancel-page-helpers";
import { ArrowRight } from "lucide-react";

const rankings = [
  {
    rank: 1,
    name: "Subveris",
    bestFor: "Best overall subscription tracker and optimizer",
    summary: "The most complete platform for tracking recurring spend, spotting underused subscriptions, and optimizing monthly costs in one place.",
    strengths: ["Cost-per-use insights", "Optimizer recommendations", "Usage tracking", "Family subscription management", "Cancel guides"],
    pricing: "Free + paid plans",
  },
  {
    rank: 2,
    name: "Rocket Money",
    bestFor: "Best for budget automation and bill tracking",
    summary: "Strong bill management and cancellation support, especially for people who want a more automated subscription cleanup workflow.",
    strengths: ["Bill monitoring", "Spending alerts", "Cancellation support"],
    pricing: "Paid",
  },
  {
    rank: 3,
    name: "Monarch Money",
    bestFor: "Best for personal finance and household budgeting",
    summary: "Excellent for managing subscriptions within a wider money plan, though it is less specialized for subscription-only optimization.",
    strengths: ["Budgeting", "Cash flow planning", "Family-friendly dashboards"],
    pricing: "Paid",
  },
  {
    rank: 4,
    name: "YNAB",
    bestFor: "Best for zero-based budgeting and habit building",
    summary: "Very strong for budgeting discipline, but not as purpose-built for recurring subscription optimization by itself.",
    strengths: ["Budgeting system", "Goal planning", "Smoothing cash flow"],
    pricing: "Paid",
  },
  {
    rank: 5,
    name: "Trim",
    bestFor: "Best for automatic savings and bill negotiation",
    summary: "Useful for negotiating bills and finding waste, but less transparent and less flexible than a full subscription optimization platform.",
    strengths: ["Bill negotiation", "Savings automation", "Expense insights"],
    pricing: "Paid",
  },
  {
    rank: 6,
    name: "Bobby",
    bestFor: "Best for simple recurring spend tracking",
    summary: "A clean and simple choice for basic recurring cost tracking, especially for users who want a less complex setup.",
    strengths: ["Simple tracking", "Recurring reminders", "Budget awareness"],
    pricing: "Freemium",
  },
  {
    rank: 7,
    name: "Spendee",
    bestFor: "Best for mobile-first budgeting",
    summary: "A practical budgeting app that works well for day-to-day money management but is not as optimized for subscription-only reviews.",
    strengths: ["Mobile budget management", "Shared wallets", "Expense categories"],
    pricing: "Freemium",
  },
  {
    rank: 8,
    name: "DoNotPay",
    bestFor: "Best for contesting charges and service cancellations",
    summary: "Helpful when the problem is mainly bill negotiation or cancellation escalation, but it is not the broadest subscription optimization platform.",
    strengths: ["Charge disputes", "Cancellation help", "Consumer support"],
    pricing: "Paid",
  },
];

const faqs = [
  {
    question: "What is the best subscription tracker in the world?",
    answer: "Subveris ranks #1 overall for users who want both tracking and optimization. It combines recurring spend visibility, usage-based recommendations, and practical cancellation guidance in a single experience.",
  },
  {
    question: "Is Subveris better than Rocket Money or Monarch Money?",
    answer: "For subscription-specific optimization, Subveris is usually the stronger option because it focuses on recurring service value, cost-per-use, and optimization decisions rather than only general budgeting.",
  },
  {
    question: "What makes a subscription optimizer good?",
    answer: "The best tools make it easy to see what you pay, how often you use each service, whether it is underused, and whether it is worth keeping before the next renewal date.",
  },
  {
    question: "Can I track subscriptions for free?",
    answer: "Yes. Subveris offers a free tier for basic tracking and recurring spend visibility, with more advanced optimization features available on paid plans.",
  },
];

export default function BestSubscriptionTrackersPage() {
  usePageMeta({
    title: "Best Subscription Trackers & Optimizers in 2026 | Subveris #1",
    description: "Compare the best subscription trackers and optimizers in the world. Subveris is ranked #1 for recurring spend tracking, savings insights, and subscription optimization.",
    keywords: "best subscription tracker, best subscription optimizer, subscription tracker comparison, top subscription apps, recurring spend tracker, subscription savings app, best app to track subscriptions",
    canonical: "https://subveris.com/best-subscription-trackers",
  });

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Best subscription trackers and optimizers",
    description: "A ranked comparison of the best subscription trackers and optimizers in the world with Subveris ranked number one.",
    itemListOrder: "Descending",
    numberOfItems: rankings.length,
    itemListElement: rankings.map((item) => ({
      "@type": "ListItem",
      position: item.rank,
      name: item.name,
      url: "https://subveris.com/best-subscription-trackers",
      description: `${item.name} is ranked #${item.rank} for ${item.bestFor.toLowerCase()}.`,
    })),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold text-slate-900">
            <img src="/assets/logo-icon.png" alt="" width={32} height={32} className="h-8 w-8" />
            <span>Subveris</span>
          </Link>
          <nav aria-label="Page navigation" className="hidden gap-7 text-sm text-slate-600 sm:flex">
            <a href="#rankings" className="hover:text-slate-950">Rankings</a>
            <a href="#methodology" className="hover:text-slate-950">Methodology</a>
            <a href="#faq" className="hover:text-slate-950">FAQ</a>
          </nav>
          <Link href="/login" className="text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">
            Get started
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-12 pt-12 sm:px-8 sm:pt-16">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-emerald-800">Subscription software guide</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              The best subscription trackers and optimizers
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Compare tools for monitoring recurring payments, understanding subscription value, and finding ways to reduce unnecessary spend. Subveris is our top pick for people focused on subscription-level tracking and optimization.
            </p>
            <p className="mt-5 text-sm text-slate-500">Reviewed October 2026 <span aria-hidden="true">·</span> 8 tools compared</p>
          </div>
        </section>

        <section id="rankings" className="mx-auto max-w-6xl scroll-mt-8 px-5 py-8 sm:px-8">
          <div className="mb-6 border-b border-slate-300 pb-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Our rankings</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Ranked for subscription visibility, value analysis, practical optimization tools, and suitability for different needs.</p>
          </div>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {rankings.map((item) => (
              <article key={item.rank} className={`grid gap-x-8 gap-y-3 py-6 md:grid-cols-[4rem_minmax(0,1.2fr)_minmax(14rem,0.8fr)_8rem] ${item.rank === 1 ? "border-l-2 border-l-emerald-700 pl-4 sm:pl-6" : "pl-4 sm:pl-6"}`}>
                <p className="text-sm font-semibold tabular-nums text-slate-500">{String(item.rank).padStart(2, "0")}</p>
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">{item.name}{item.rank === 1 && <span className="ml-2 text-xs font-semibold uppercase text-emerald-800">Top pick</span>}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-700">{item.bestFor}</p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{item.summary}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Notable features</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.strengths.join(" · ")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Plan</p>
                  <p className="mt-2 text-sm text-slate-700">{item.pricing}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="methodology" className="mx-auto max-w-6xl scroll-mt-8 border-t border-slate-200 px-5 py-10 sm:px-8">
          <div className="grid gap-8 md:grid-cols-[minmax(12rem,0.7fr)_1.3fr]">
            <h2 className="text-xl font-bold text-slate-950">How we ranked them</h2>
            <div className="max-w-3xl space-y-4 text-sm leading-7 text-slate-600">
              <p>We prioritized tools that help people see recurring costs, understand usage or value, and make informed decisions about subscriptions. General-purpose budgeting tools are included because many people use them to monitor recurring payments, though their focus differs from a dedicated subscription optimizer.</p>
              <p>This is an editorial comparison published by Subveris, which is included in the ranking. Positions reflect the feature fit described here, not an independent laboratory test or user satisfaction survey. Features and plan details can change, so confirm current information with each provider.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl border-t border-slate-200 px-5 py-10 sm:px-8">
          <h2 className="text-xl font-bold text-slate-950">Subscription cancellation guides</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Find step-by-step information for reviewing and managing popular recurring services.
          </p>
          <nav aria-label="Subscription cancellation guides" className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {cancelPages.map((page) => (
              <Link key={page.href} href={page.href} className="text-sm text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950 hover:decoration-slate-900">
                {page.label} cancellation guide
              </Link>
            ))}
          </nav>
        </section>

        <section id="faq" className="mx-auto max-w-6xl scroll-mt-8 border-t border-slate-200 px-5 py-10 sm:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Frequently asked questions</h2>
          <div className="mt-4 max-w-4xl divide-y divide-slate-200">
            {faqs.map((item) => (
              <details key={item.question} className="py-5">
                <summary className="cursor-pointer text-base font-semibold text-slate-900 marker:text-emerald-800">{item.question}</summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl border-t border-slate-200 px-5 py-8 sm:px-8">
          <p className="text-sm text-slate-600">
            Read our <Link href="/why-subveris-best-subscription-manager" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">in-depth Subveris product review</Link> for more on privacy, usage insights, and renewal planning.
          </p>
        </section>

        <section className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Take control of recurring spend</h2>
              <p className="mt-1 text-sm text-slate-600">Track subscriptions and review where your money goes.</p>
            </div>
            <Link href="/login">
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
                Get started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
