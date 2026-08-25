import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth-modal";
import { CurrencySelector } from "@/components/currency-selector";
import { usePageMeta } from "@/lib/usePageMeta";
import {
  TrendingUp,
  Shield,
  BarChart3,
  Zap,
  CheckCircle,
  Star,
  ArrowRight,
  Play,
  Users,
  DollarSign,
  Check,
  Sparkles,
  Gauge,
  Lock,
  Brain,
  Target,
  Mail,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  PieChart,
  Calendar,
  Bot,
  Eye,
  MessageCircle,
  X,
  Target as TargetIcon,
  Lightbulb,
} from "lucide-react";

export default function HomePage() {
  usePageMeta({
    title: "Subveris | Subscription Optimization to Save Money on Recurring Payments",
    description: "Subveris helps you understand recurring spending, compare subscription value by usage, and review services that may no longer fit your budget.",
    keywords: "subscription optimization, recurring payments, save money, cancel subscriptions, subscription savings, subscription tracker",
    canonical: "https://subveris.com/",
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<'signin' | 'signup'>('signup');
  const [expandedFAQ, setExpandedFAQ] = useState<number | string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const comparison = [
    {
      feature: "Bank connection",
      details: "Not required. You can add subscriptions manually.",
    },
    {
      feature: "Usage signals",
      details: "Recorded usage and supported browser-extension signals can inform your overview.",
    },
    {
      feature: "Value analysis",
      details: "Monthly cost is compared with activity, frequency, recency, and cost per use.",
    },
    {
      feature: "Recommendations",
      details: "The app highlights services that may be unused, underused, or poor value for you to review.",
    },
    {
      feature: "Cancellation",
      details: "Cancellation guides and provider links help you complete the action yourself.",
    },
    {
      feature: "Your decision",
      details: "Subveris surfaces evidence; you decide whether to keep, downgrade, or cancel.",
    },
  ];

  const featureHighlights = [
    {
      icon: DollarSign,
      title: "Cost Per Use",
      description: "Know what each subscription actually costs you per session so you can optimize spend and keep only the highest-value services.",
    },
    {
      icon: Zap,
      title: "Optional Browser Signals",
      description: "Add the optional cross-browser extension (Chrome, Edge, Firefox, Safari) when you want richer usage signals in your subscription overview.",
    },
    {
      icon: Brain,
      title: "Usage-Based Recommendations",
      description: "Subveris highlights possible savings using the subscription costs, usage frequency, recent activity, and cost per use recorded in your account.",
    },
  ];

  const problems = [
    {
      icon: Eye,
      text: "Most people don't know what they actually use.",
    },
    {
      icon: RefreshCw,
      text: "Subscriptions auto-renew silently.",
    },
    {
      icon: AlertCircle,
      text: "You pay for services you forgot about.",
    },
    {
      icon: Gauge,
      text: "You don't know your real cost per use.",
    },
  ];

  const faqs = [
    {
      question: "How much am I actually spending on subscriptions?",
      answer: "Add your recurring services to Subveris and the dashboard calculates your monthly subscription spend, spending by category, recent spending history, and a yearly projection. The totals are based on the subscription details in your account, so they become more complete as you add or update services.",
    },
    {
      question: "Which subscriptions are actually worth keeping?",
      answer: "Subveris does not make that decision for you. It compares the cost of a service with the usage you record, including sessions per month, time since last use, and cost per use. It then highlights services that look unused, underused, or poor value so you can decide what to keep, downgrade, or cancel.",
    },
    {
      question: "Is there a free subscription tracking app?",
      answer: "Yes. Subveris has a free plan with manual subscription entry, a basic spending overview, monthly spending reports, free cancellation guides, and support for up to five recurring services. Cost-per-use analytics on the free plan is available for up to two subscriptions; unlimited tracking and additional optimization features are part of paid plans.",
    },
    {
      question: "How are the recommendations made?",
      answer: "Recommendations use the subscription details and usage data in your account, including cost per use, sessions per month, usage frequency, and time since last use. They are decision support, not a guarantee that you should cancel a service, so you can review the details and choose the action yourself.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden shadow-sm">
              <img src="/assets/logo-icon.png" alt="Subveris Logo" width={40} height={40} className="h-full w-full object-cover" />
            </div>
            <span className="text-xl font-bold tracking-tight">Subveris</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#problem" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Why You Need This
            </a>
            <a href="#comparison" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Why Us
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              FAQs
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button onClick={() => { setAuthDefaultTab('signin'); setAuthModalOpen(true); }} variant="ghost" size="sm" className="text-xs font-medium sm:text-sm">
              Log In
            </Button>
            <Button onClick={() => { setAuthDefaultTab('signup'); setAuthModalOpen(true); }} size="sm" className="bg-primary px-3 text-xs hover:bg-primary/90 sm:text-sm">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* 1️⃣ HERO SECTION */}
      <section className="container mx-auto px-4 py-32 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse delay-1000" />
        
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-semibold">
            <Sparkles className="h-3 w-3 mr-2" />
            The Subscription Optimization Platform
          </Badge>
          
          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter mb-8 leading-tight">
            Find the subscriptions you don't use
            <br />
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">before they renew again.</span>
          </h1>
          
          <p className="text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            See your recurring spend, understand what each service costs per use, and review the subscriptions that may no longer earn their place in your budget.
            <br />
            <span className="font-semibold text-foreground">Start with the services you already pay for.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" className="text-lg px-12 py-7 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 shadow-2xl hover:shadow-[0_30px_120px_rgba(59,130,246,0.18)] transition-all duration-300" onClick={() => setAuthModalOpen(true)}>
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="mx-auto flex flex-wrap justify-center items-center gap-6 rounded-full border border-slate-200/70 bg-white/80 px-6 py-4 shadow-lg shadow-slate-200/50 backdrop-blur-sm text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>No bank connection required</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-500" />
              <span>Session-protected access</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Usage-based insights</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span>Simple setup</span>
            </div>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-4 text-left">
            <div className="rounded-3xl border border-border/40 bg-white/85 p-6 shadow-lg">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">No bank data required</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Subveris does not require bank credentials, payment details, or account linking to help you track and optimize recurring services.
              </p>
            </div>
            <div className="rounded-3xl border border-border/40 bg-white/85 p-6 shadow-lg">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Protected access</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Sensitive actions use authenticated sessions and CSRF checks so your account and billing-related requests are not treated as anonymous.
              </p>
            </div>
            <div className="rounded-3xl border border-border/40 bg-white/85 p-6 shadow-lg">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Eye className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">You control the data</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The product is built around the subscriptions you add and the usage signals you intentionally share, rather than hidden financial data collection.
              </p>
            </div>
            <div className="rounded-3xl border border-border/40 bg-white/85 p-6 shadow-lg">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <TargetIcon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Usage-based recommendations</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Recommendations are grounded in the subscriptions you maintain and the usage patterns you track, so decisions are based on real behavior.
              </p>
            </div>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-3 text-left">
            <div className="rounded-3xl border border-border/40 bg-background/80 p-8 shadow-lg">
              <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-3 mb-4">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Cost Per Use Intelligence</h3>
              <p className="text-muted-foreground leading-relaxed">
                Understand the real value of every subscription and uncover exactly which services are worth keeping.
              </p>
            </div>
            <div className="rounded-3xl border border-border/40 bg-background/80 p-8 shadow-lg">
              <div className="inline-flex items-center justify-center rounded-2xl bg-blue-500/10 p-3 mb-4">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Renewal Risk Intelligence</h3>
              <p className="text-muted-foreground leading-relaxed">
                Find subscriptions that are about to renew, flag services with low return, and keep your budget from leaking.
              </p>
            </div>
            <div className="rounded-3xl border border-border/40 bg-background/80 p-8 shadow-lg">
              <div className="inline-flex items-center justify-center rounded-2xl bg-green-500/10 p-3 mb-4">
                <Sparkles className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Optimization Workflows</h3>
              <p className="text-muted-foreground leading-relaxed">
                Turn insights into action with recommendations, plan change suggestions, and savings opportunities you can act on now.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2️⃣ PROBLEM SECTION */}
      <section id="problem" className="bg-muted/30 py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 tracking-tight">
              Subscriptions are designed to be forgotten.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Recurring charges are easy to start and easy to overlook. Subveris gives you one place to review what you pay for and how often you use it.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {problems.map((item, index) => (
              <div key={index} className="bg-white/90 p-8 rounded-[1.75rem] shadow-lg border border-slate-200/70 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(15,23,42,0.10)] transition-all duration-300 group">
                <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-300">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-lg font-semibold leading-snug text-slate-800">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3️⃣ FEATURES SECTION */}
      <section id="features" className="container mx-auto px-4 py-28">
        <div className="max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-6 max-w-full border-primary px-4 py-1 text-center text-primary whitespace-normal">Premium Features</Badge>
          <h2 className="text-5xl font-bold mb-8 tracking-tight">Features designed for high-value spenders.</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mb-12">
            Subveris combines clear data handling with practical analytics so you can make better decisions about recurring spending.
          </p>
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-border/30 bg-slate-50 shadow-2xl shadow-slate-200/50 mb-12">
            <div className="bg-white p-4 sm:p-6">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-border/20 bg-slate-50">
                <picture>
                  <source
                    type="image/jpeg"
                    srcSet="/assets/dashboard-screenshot-800.jpg 800w, /assets/dashboard-screenshot-1200.jpg 1200w"
                    sizes="(max-width: 768px) 100vw, 1200px"
                  />
                  <img
                    src="/assets/dashboard-screenshot-1200.jpg"
                    alt="Subveris dashboard screenshot"
                    width={1200}
                    height={682}
                    decoding="async"
                    className="w-full rounded-[1.75rem] object-cover"
                  />
                </picture>
                <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-gradient-to-t from-slate-950/10 via-transparent to-transparent" />
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {featureHighlights.map((feature, index) => (
              <div key={index} className="flex flex-col gap-6 rounded-3xl border border-border/40 bg-white/80 p-8 shadow-lg transition-transform hover:-translate-y-1 dark:bg-slate-900/70">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4️⃣ COMPARISON SECTION */}
      <section id="comparison" className="bg-muted/30 py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 tracking-tight">What Subveris shows you</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              A clear view of the information Subveris uses to help you review recurring spending.
            </p>
          </div>

          <div className="max-w-4xl mx-auto overflow-x-auto rounded-[2rem] shadow-2xl border border-slate-200/70 bg-white/95">
            <table className="min-w-[560px] w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/5 border-b border-slate-200/70">
                  <th className="p-8 text-lg font-bold text-slate-900">Capability</th>
                  <th className="p-8 text-lg font-bold text-slate-900 text-center bg-primary/5">How it works</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((item, index) => (
                  <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-8 font-medium">{item.feature}</td>
                    <td colSpan={1} className="p-8 text-center text-muted-foreground bg-primary/5">{item.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5️⃣ PRODUCT PROOF SECTION */}
      <section className="container mx-auto px-4 py-28">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6 tracking-tight">See what Subveris actually does</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            No invented reviews or inflated numbers. These are the product capabilities you can try and verify for yourself.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-border/50 shadow-md hover:shadow-xl transition-all bg-white/80 dark:bg-slate-900/70">
            <CardContent className="pt-8">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Start with your real spend</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                Add recurring services manually and see monthly totals, category spending, recent history, and a yearly projection based on your entries.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-md hover:shadow-xl transition-all bg-white/80 dark:bg-slate-900/70">
            <CardContent className="pt-8">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Measure value by usage</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                Record how often you use a service and compare its monthly cost with sessions, recent activity, and cost per use.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-md hover:shadow-xl transition-all bg-white/80 dark:bg-slate-900/70">
            <CardContent className="pt-8">
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Choose the next action</h3>
              <p className="text-base leading-relaxed text-muted-foreground">
                Review recommendations and use the included cancellation guides when a service no longer earns its place in your budget.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 8️⃣ BIG VISION SECTION */}
      <section className="bg-gradient-to-r from-primary/5 via-blue-500/5 to-primary/5 py-28 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-5xl font-bold mb-8 tracking-tight">
              The Future of Recurring Spending
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              We believe recurring digital spending will define modern finances. Our mission is to build the infrastructure layer that helps people optimize, control, and understand every recurring payment—not just subscriptions.
            </p>
            <p className="text-lg text-foreground font-medium">
              We're not just a tool. We're building the future of financial awareness.
            </p>
          </div>
        </div>
      </section>

      {/* TRUSTED BY SECTION */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-bold mb-4">Built for trust and clarity</h3>
            <p className="text-muted-foreground">
              People use Subveris because it keeps recurring spend understandable and under their control.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5 text-center">
            <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-5 shadow-sm"><div className="text-sm text-muted-foreground">No bank link required</div></div>
            <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-5 shadow-sm"><div className="text-sm text-muted-foreground">Usage-based insights</div></div>
            <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-5 shadow-sm"><div className="text-sm text-muted-foreground">Account-level protection</div></div>
            <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-5 shadow-sm"><div className="text-sm text-muted-foreground">Clear renewal visibility</div></div>
            <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-5 shadow-sm"><div className="text-sm text-muted-foreground">Built around user control</div></div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="bg-muted/30 py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 tracking-tight">
              Pricing for people who want better subscription decisions.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free. Upgrade anytime. Cancel anytime. Cancellation guides are included for everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {/* FREE PLAN */}
            <Card className="relative flex flex-col transition-all border border-border/50 shadow-md hover:shadow-lg hover:border-primary/30 bg-white/80 dark:bg-slate-900/70">
              <CardHeader className="text-center pb-6 pt-8">
                <CardTitle className="text-3xl font-bold">Free</CardTitle>
                <div className="mt-6">
                  <span className="text-5xl font-bold text-foreground">€0</span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
                <CardDescription className="mt-4 text-base">
                  Full power to optimize, up to 5 subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Manage up to 5 subscriptions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Cost-per-use analytics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Behavioral insights & trends</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Usage-based recommendations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Savings projections</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Export reports</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Extension tracking</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-muted-foreground mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Autopilot automation</span>
                  </li>
                </ul>
              </CardContent>
              <div className="p-6 pt-2">
                <Button
                  variant="outline"
                  className="w-full font-semibold py-6 text-base border-2 hover:bg-muted/50"
                  size="lg"
                  onClick={() => setAuthModalOpen(true)}
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* PREMIUM PLAN */}
            <Card className="relative flex flex-col transition-all border-2 border-primary shadow-2xl scale-105 bg-gradient-to-br from-primary/5 to-blue-500/5 hover:shadow-2xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-primary to-blue-600 text-white px-4 py-2 font-semibold shadow-lg">
                  <Sparkles className="h-4 w-4 mr-2 fill-white" />
                  Popular
                </Badge>
              </div>

              <CardHeader className="text-center pb-6 pt-8">
                <CardTitle className="text-3xl font-bold">Premium</CardTitle>
                <div className="mt-6">
                  <span className="text-5xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">€9.99</span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
                <CardDescription className="mt-4 text-base font-medium">
                  Unlimited subscriptions + optimization workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Unlimited subscriptions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Browser extension tracking</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Cost-per-use analytics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Usage-based recommendations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Behavioral insights</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Savings projections</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Optimization workflows</span>
                  </li>
                </ul>
              </CardContent>
              <div className="p-6 pt-2">
                <Button
                  className="w-full font-semibold py-6 text-base bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 shadow-lg"
                  size="lg"
                  onClick={() => setAuthModalOpen(true)}
                >
                  Upgrade Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* FAMILY PLAN */}
            <Card className="relative flex flex-col transition-all border-2 border-purple-500/50 shadow-xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 hover:shadow-xl hover:border-purple-500/80">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 font-semibold shadow-lg">
                  <Users className="h-4 w-4 mr-2" />
                  Best for Families
                </Badge>
              </div>

              <CardHeader className="text-center pb-6 pt-8">
                <CardTitle className="text-3xl font-bold">Family</CardTitle>
                <div className="mt-6">
                  <span className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">€14.99</span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
                <CardDescription className="mt-4 text-base font-medium">
                  Share subscriptions and automate with family
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Everything in Premium</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Optimization workflows</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Family spending optimization</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Share subscriptions with members</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Family spending insights</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Split costs with family</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Up to 5 family members</span>
                  </li>
                </ul>
              </CardContent>
              <div className="p-6 pt-2">
                <Button
                  className="w-full font-semibold py-6 text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg text-white"
                  size="lg"
                  onClick={() => setAuthModalOpen(true)}
                >
                  Upgrade Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Pricing Details */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <p className="text-muted-foreground mb-8">
              <span className="font-semibold text-foreground">Average Premium user saves $120/month</span> — that's $1,440 per year.
            </p>
          </div>

          {/* Feature Comparison Table */}
          <div className="max-w-6xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">Detailed Feature Comparison</h3>
            <div className="max-w-full overflow-x-auto overscroll-x-contain">
              <table className="min-w-[620px] w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-primary/20">
                    <th className="text-left py-4 px-6 font-semibold">Feature</th>
                    <th className="text-center py-4 px-6 font-semibold text-muted-foreground">Free</th>
                    <th className="text-center py-4 px-6 font-semibold text-primary bg-primary/5">Premium</th>
                    <th className="text-center py-4 px-6 font-semibold text-purple-600 bg-purple-500/5">Family</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Subscriptions Managed</td>
                    <td className="text-center py-4 px-6 text-muted-foreground">Up to 5</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5">Unlimited</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5">Unlimited</td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Browser Extension Tracking</td>
                    <td className="text-center py-4 px-6"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Cost Per Use Analytics</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5">Yes, unlimited</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5">Yes, unlimited</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5">Yes, unlimited</td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Usage-Based Recommendations</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Behavioral Insights</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Savings Projections</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Export Reports</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Optimization Workflows</td>
                    <td className="text-center py-4 px-6"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-purple-500/5"><Check className="h-5 w-5 text-purple-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Family Sharing</td>
                    <td className="text-center py-4 px-6"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-6"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-purple-500/5"><Check className="h-5 w-5 text-purple-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Up to 5 Family Members</td>
                    <td className="text-center py-4 px-6"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-6"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-purple-500/5"><Check className="h-5 w-5 text-purple-600 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ for Pricing */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">Pricing Questions</h3>
            <div className="space-y-4">
              <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === 'payment' ? null : 'payment')}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/30 transition-colors"
                >
                  <h3 className="text-lg font-semibold pr-4">Can I switch plans anytime?</h3>
                  {expandedFAQ === 'payment' ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {expandedFAQ === 'payment' && (
                  <div className="px-6 pb-6 pt-0 text-muted-foreground leading-relaxed border-t border-border/50">
                    Yes! You can upgrade to Premium or downgrade to Free anytime. Your subscription is immediately updated, and billing adjusts proportionally.
                  </div>
                )}
              </Card>

              <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === 'cancel' ? null : 'cancel')}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/30 transition-colors"
                >
                  <h3 className="text-lg font-semibold pr-4">Can I cancel anytime?</h3>
                  {expandedFAQ === 'cancel' ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {expandedFAQ === 'cancel' && (
                  <div className="px-6 pb-6 pt-0 text-muted-foreground leading-relaxed border-t border-border/50">
                    Absolutely. No contracts, no lock-in periods, no penalties. Cancel your Premium subscription anytime and instantly fall back to the Free plan.
                  </div>
                )}
              </Card>

              <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === 'discount' ? null : 'discount')}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/30 transition-colors"
                >
                  <h3 className="text-lg font-semibold pr-4">Do you offer annual plans or discounts?</h3>
                  {expandedFAQ === 'discount' ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
                {expandedFAQ === 'discount' && (
                  <div className="px-6 pb-6 pt-0 text-muted-foreground leading-relaxed border-t border-border/50">
                    Currently we offer monthly billing at $9.99/month. We're evaluating annual plans for power users. Contact our team if you're interested!
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 9️⃣ FAQ SECTION */}
      <section id="faq" className="container mx-auto px-4 py-28">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6 tracking-tight">
            Common Questions
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="border border-border/50 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/30 transition-colors"
              >
                <h3 className="text-lg font-semibold pr-4">{faq.question}</h3>
                {expandedFAQ === index ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              {expandedFAQ === index && (
                <div className="px-6 pb-6 pt-0 text-muted-foreground leading-relaxed border-t border-border/50">
                  {faq.answer}
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* 🔟 FINAL CTA SECTION */}
      <section className="bg-gradient-to-r from-primary/10 to-blue-500/10 py-32 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-6xl font-bold mb-8 tracking-tight">
              Start Optimizing Your Subscriptions Today
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Start saving money and gain complete control over your recurring spending.
            </p>

            <div className="bg-white/80 border border-border/50 rounded-lg p-6 mb-8 max-w-2xl mx-auto dark:bg-slate-900/70">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Free forever plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" className="text-lg px-12 py-8 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 shadow-xl" onClick={() => setAuthModalOpen(true)}>
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Need help? Contact our support team
              </p>
              <a
                href="mailto:help.subveris@gmail.com"
                className="text-primary font-semibold hover:underline text-sm"
              >
                help.subveris@gmail.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 tracking-tight">
                Get in Touch
              </h2>
              <p className="text-lg text-muted-foreground">
                Have questions? Need help? We're here to assist you.
              </p>
            </div>

            <div className="max-w-md mx-auto">
              <Card className="border border-border/50 shadow-md hover:shadow-lg transition-all text-center">
                <CardContent className="p-8">
                  <div className="flex justify-center mb-6">
                    <div className="p-4 rounded-xl bg-primary/10">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3">Email Support</h3>
                  <p className="text-muted-foreground mb-4">
                    Get help from our expert support team. We typically respond within 24 hours.
                  </p>
                  <a
                    href="mailto:help.subveris@gmail.com"
                    className="text-primary font-semibold hover:underline"
                  >
                    help.subveris@gmail.com
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border/40 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden shadow-sm">
                <img src="/assets/logo-icon.png" alt="Subveris Logo" width={32} height={32} className="h-full w-full object-cover" />
              </div>
              <span className="text-lg font-bold tracking-tight">Subveris</span>
            </div>
            
            <nav className="flex flex-wrap justify-center gap-8 text-sm font-medium text-muted-foreground">
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/security" className="hover:text-foreground transition-colors">Security</a>
              <a href="/cookies" className="hover:text-foreground transition-colors">Cookies</a>
            </nav>

            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Subveris. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} defaultTab={authDefaultTab} />
    </div>
  );
}
