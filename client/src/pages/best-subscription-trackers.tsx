import { Link } from "wouter";
import { usePageMeta } from "@/lib/usePageMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BarChart3,
  Check,
  Crown,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

const rankings = [
  {
    rank: 1,
    name: "Subveris",
    bestFor: "Best overall subscription tracker and optimizer",
    rating: "9.9/10",
    summary: "The most complete platform for tracking recurring spend, spotting underused subscriptions, and optimizing monthly costs in one place.",
    strengths: ["Cost-per-use insights", "Optimizer recommendations", "Usage tracking", "Family subscription management", "Cancel guides"],
    pricing: "Free + paid plans",
    label: "#1 Overall",
  },
  {
    rank: 2,
    name: "Rocket Money",
    bestFor: "Best for budget automation and bill tracking",
    rating: "9.3/10",
    summary: "Strong bill management and cancellation support, especially for people who want a more automated subscription cleanup workflow.",
    strengths: ["Bill monitoring", "Spending alerts", "Cancellation support"],
    pricing: "Paid",
    label: "Top budget tool",
  },
  {
    rank: 3,
    name: "Monarch Money",
    bestFor: "Best for personal finance and household budgeting",
    rating: "9.0/10",
    summary: "Excellent for managing subscriptions within a wider money plan, though it is less specialized for subscription-only optimization.",
    strengths: ["Budgeting", "Cash flow planning", "Family-friendly dashboards"],
    pricing: "Paid",
    label: "Great for budgeters",
  },
  {
    rank: 4,
    name: "YNAB",
    bestFor: "Best for zero-based budgeting and habit building",
    rating: "8.8/10",
    summary: "Very strong for budgeting discipline, but not as purpose-built for recurring subscription optimization by itself.",
    strengths: ["Budgeting system", "Goal planning", "Smoothing cash flow"],
    pricing: "Paid",
    label: "Budgeting leader",
  },
  {
    rank: 5,
    name: "Trim",
    bestFor: "Best for automatic savings and bill negotiation",
    rating: "8.2/10",
    summary: "Useful for negotiating bills and finding waste, but less transparent and less flexible than a full subscription optimization platform.",
    strengths: ["Bill negotiation", "Savings automation", "Expense insights"],
    pricing: "Paid",
    label: "Good automation",
  },
  {
    rank: 6,
    name: "Bobby",
    bestFor: "Best for simple recurring spend tracking",
    rating: "7.9/10",
    summary: "A clean and simple choice for basic recurring cost tracking, especially for users who want a less complex setup.",
    strengths: ["Simple tracking", "Recurring reminders", "Budget awareness"],
    pricing: "Freemium",
    label: "Simple and clean",
  },
  {
    rank: 7,
    name: "Spendee",
    bestFor: "Best for mobile-first budgeting",
    rating: "7.7/10",
    summary: "A practical budgeting app that works well for day-to-day money management but is not as optimized for subscription-only reviews.",
    strengths: ["Mobile budget management", "Shared wallets", "Expense categories"],
    pricing: "Freemium",
    label: "Strong mobile app",
  },
  {
    rank: 8,
    name: "DoNotPay",
    bestFor: "Best for contesting charges and service cancellations",
    rating: "7.4/10",
    summary: "Helpful when the problem is mainly bill negotiation or cancellation escalation, but it is not the broadest subscription optimization platform.",
    strengths: ["Charge disputes", "Cancellation help", "Consumer support"],
    pricing: "Paid",
    label: "Good for disputes",
  },
];

const useCases = [
  {
    title: "For people who want the best long-term value",
    description: "Subveris helps you compare recurring spend with actual service usage so you can cut waste without cutting the subscriptions you actually value.",
    icon: TrendingUp,
  },
  {
    title: "For households sharing subscriptions",
    description: "You can track family plans, shared services, and group costs in one place, making it easier to see which services are worth keeping together.",
    icon: Wallet,
  },
  {
    title: "For people who want clear recommendations",
    description: "Instead of guessing, Subveris highlights warning signs like underuse, inactivity, and premium subscriptions that no longer fit your routine.",
    icon: Zap,
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              S
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">Subveris</div>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#rankings" className="hover:text-slate-900">Rankings</a>
            <a href="#why-subveris" className="hover:text-slate-900">Why Subveris</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <Link href="/login">
            <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">Get started</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <Badge className="mb-5 border-slate-200 bg-slate-100 text-slate-700">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Best subscription tracker & optimizer
              </Badge>

              <h1 className="max-w-2xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Best subscription trackers and optimizers in the world — Subveris is ranked #1.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                We ranked the best tools for recurring spend tracking, subscription optimization, and cost-cutting. Subveris takes the top spot for combining clear analytics, practical recommendations, and real savings potential in one platform.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/login">
                  <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800">
                    Try Subveris
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#rankings">
                  <Button variant="outline" size="lg" className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100">
                    See the full ranking
                  </Button>
                </a>
              </div>

              <ul className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
                <li className="rounded-full border border-slate-200 bg-white px-3 py-1.5">#1 overall</li>
                <li className="rounded-full border border-slate-200 bg-white px-3 py-1.5">Best value</li>
                <li className="rounded-full border border-slate-200 bg-white px-3 py-1.5">Tracking + optimization</li>
                <li className="rounded-full border border-slate-200 bg-white px-3 py-1.5">Family ready</li>
              </ul>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.28)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium uppercase tracking-[0.12em] text-slate-500">Top rank</div>
                  <div className="mt-2 flex items-center gap-2 text-3xl font-black text-slate-950">
                    <Crown className="h-6 w-6 text-amber-500" />
                    Subveris
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">9.9/10</Badge>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  "Tracks recurring subscriptions in one dashboard",
                  "Shows savings opportunities and underused services",
                  "Helps you decide what to keep, downgrade, or cancel",
                  "Designed for both individuals and families",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                    <div className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="rankings" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">The tierlist</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Best subscription trackers and optimizers ranked</h2>
            </div>
            <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 md:block">
              Updated for 2026
            </div>
          </div>

          <div className="space-y-4">
            {rankings.map((item) => (
              <article
                key={item.rank}
                className={`rounded-[24px] border p-5 shadow-sm transition ${
                  item.rank === 1
                    ? "border-amber-300 bg-gradient-to-r from-amber-50 via-white to-white shadow-[0_18px_45px_-30px_rgba(245,158,11,0.5)]"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-black ${item.rank === 1 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-700"}`}>
                      {item.rank}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-slate-950">{item.name}</h3>
                        <Badge className={item.rank === 1 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}>{item.label}</Badge>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-500">{item.bestFor}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:justify-end">
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{item.rating}</div>
                    <div className="text-sm font-medium text-slate-500">{item.pricing}</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <p className="text-base leading-7 text-slate-600">{item.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.strengths.map((strength) => (
                        <span key={strength} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>

                  {item.rank === 1 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-amber-700">
                        <Star className="h-4 w-4 fill-current" />
                        Why it wins
                      </div>
                      <p className="mt-3 text-sm leading-6 text-amber-900">
                        Subveris combines recurring expense visibility, usage-based recommendations, and action-oriented guidance so users can cut waste without losing the subscriptions they actually value.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">
                        <BarChart3 className="h-4 w-4" />
                        Best for
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{item.bestFor}</p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="why-subveris" className="bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Why Subveris ranks #1</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">The best all-round subscription optimizer for real people</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {useCases.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">{title}</h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-[30px] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_35px_80px_-40px_rgba(15,23,42,0.7)] lg:p-12">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">What matters most</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">The best subscription tracker is the one that helps you act.</h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                  A good app does more than list renewals. It shows your total recurring spend, highlights weak value, and gives you the confidence to keep or cancel the right subscriptions before they renew.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Clarity
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-200">See your monthly recurring spend at a glance and understand what is actually draining your budget.</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">
                    <Sparkles className="h-4 w-4 text-violet-400" />
                    Optimization
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-200">Use subscriptions more intentionally with recommendations that help you notice underused services.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Frequently asked questions</h2>
          </div>

          <div className="space-y-5">
            {faqs.map((item) => (
              <div key={item.question} className="rounded-[22px] border border-slate-200 bg-white p-6">
                <h3 className="text-xl font-bold text-slate-950">{item.question}</h3>
                <p className="mt-3 text-base leading-7 text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 rounded-[28px] border border-slate-200 bg-slate-50 p-8 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Ready to optimize your subscriptions?</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Start tracking and saving with Subveris.</h2>
              </div>
              <Link href="/login">
                <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800">
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
