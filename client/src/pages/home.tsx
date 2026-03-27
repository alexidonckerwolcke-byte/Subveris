import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { CurrencySelector } from "@/components/currency-selector";
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | string | null>(null);

  // Comparison data for "Why We're Different"
  const comparison = [
    {
      feature: "Bank connection required",
      others: "Yes",
      us: "No",
    },
    {
      feature: "Usage-based insights",
      others: "No",
      us: "Yes",
    },
    {
      feature: "Cost per use analytics",
      others: "No",
      us: "Yes",
    },
    {
      feature: "Privacy-focused",
      others: "Medium",
      us: "High",
    },
    {
      feature: "Lightweight",
      others: "No",
      us: "Yes",
    },
    {
      feature: "AI recommendations",
      others: "Limited",
      us: "Advanced",
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: "Install Browser Extension",
      description: "Add our lightweight extension to Chrome or Edge. It tracks which services you actually use—nothing more.",
      icon: Bot,
    },
    {
      step: 2,
      title: "Add Your Subscriptions",
      description: "Input your subscriptions manually or let our smart suggestions match them to your subscription list.",
      icon: TargetIcon,
    },
    {
      step: 3,
      title: "Get Optimized",
      description: "See cost-per-use, get AI recommendations, and stop bleeding money on subscriptions you don't use.",
      icon: TrendingUp,
    },
  ];

  const featureHighlights = [
    {
      icon: DollarSign,
      title: "Cost Per Use",
      description: "Know what each subscription actually costs you per session. Make informed decisions based on real value.",
    },
    {
      icon: AlertCircle,
      title: "Smart Renewal Alerts",
      description: "Never get surprised by unexpected renewals. Get notified before your subscriptions renew.",
    },
    {
      icon: Brain,
      title: "AI Recommendations",
      description: "Our machine learning analyzes your usage and suggests which subscriptions to keep, downgrade, or cancel.",
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
      question: "How does Subveris track my subscriptions?",
      answer: "We use a lightweight browser extension that monitors which services you actually visit. That's it. We don't connect to your bank, track transactions, or sell your data. Just real usage tracking.",
    },
    {
      question: "Is my data safe?",
      answer: "Yes. Bank-level encryption (256-bit SSL), SOC 2 certified, and we never share your data. Your financial information stays yours.",
    },
    {
      question: "Can I use it on mobile?",
      answer: "The browser extension works on Chrome and Edge desktop. Mobile app is coming soon. Full subscription management is available on all devices right now.",
    },
    {
      question: "How accurate are the AI recommendations?",
      answer: "Our AI analyzes your actual usage patterns. Subscriptions are ranked as Active, Minimal Use, or Unused. You can always override and customize thresholds.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TrendingUp className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">Subveris</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#problem" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Why You Need This
            </a>
            <a href="#solution" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
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

          <div className="flex items-center gap-4">
            <CurrencySelector />
            <ThemeToggle />
            <Button onClick={() => setAuthModalOpen(true)} size="lg" className="bg-primary hover:bg-primary/90">
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
            Take Control of Your
            <br />
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Subscriptions</span>
          </h1>
          
          <p className="text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            See what you pay. See what you use. 
            <br />
            <span className="font-semibold text-foreground">Stop wasting money.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" className="text-lg px-10 py-7 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all" onClick={() => setAuthModalOpen(true)}>
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-10 py-7 border-2">
              <Play className="mr-2 h-5 w-5" />
              See How It Works
            </Button>
          </div>

          {/* Social Proof Stats */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-12 text-sm mb-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">50K+</div>
              <div className="text-muted-foreground">People Optimizing</div>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">$25M+</div>
              <div className="text-muted-foreground">Saved Together</div>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">$180</div>
              <div className="text-muted-foreground">Avg. Monthly Savings</div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>SOC 2 Type II Certified</span>
            </div>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-500" />
              <span>Bank-Level Security</span>
            </div>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>GDPR Compliant</span>
            </div>
            <div className="w-px h-4 bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span>4.9/5 User Rating</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2️⃣ PROBLEM SECTION */}
      <section id="problem" className="bg-muted/30 py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 tracking-tight">
              Subscriptions Are Quietly Draining Your Money
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The average person wastes <span className="font-semibold">$300+ per year</span> on unused subscriptions. That's money you could save.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {problems.map((problem, index) => (
              <Card key={index} className="border border-border/50 shadow-sm hover:shadow-md transition-all bg-card/50 backdrop-blur hover:bg-card">
                <CardContent className="p-8 flex items-start gap-6">
                  <div className="p-3 rounded-lg bg-red-500/10 flex-shrink-0">
                    <problem.icon className="h-6 w-6 text-red-500" />
                  </div>
                  <p className="text-lg font-medium leading-relaxed">{problem.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 3️⃣ SOLUTION SECTION - NOT ANOTHER BUDGETING APP */}
      <section id="solution" className="container mx-auto px-4 py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 tracking-tight">
              Not Another Budgeting App
            </h2>
            <p className="text-xl text-muted-foreground mb-12">
              We're different because we focus on what matters: <span className="font-semibold text-foreground">actual usage.</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <Card className="border border-red-500/20 bg-red-500/5">
              <CardContent className="p-8">
                <h3 className="text-lg font-bold mb-6 text-red-600 flex items-center gap-2">
                  <X className="h-5 w-5" />
                  We DON'T
                </h3>
                <ul className="space-y-4 text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="text-red-500 font-bold">❌</span>
                    <span>Connect to your bank</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500 font-bold">❌</span>
                    <span>Sell your financial data</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500 font-bold">❌</span>
                    <span>Track your transactions</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-red-500 font-bold">❌</span>
                    <span>Complicate your finances</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border border-green-500/20 bg-green-500/5">
              <CardContent className="p-8">
                <h3 className="text-lg font-bold mb-6 text-green-600 flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  We DO
                </h3>
                <ul className="space-y-4 text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="text-green-500 font-bold">✅</span>
                    <span>Track actual usage via browser extension</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-green-500 font-bold">✅</span>
                    <span>Calculate cost per use</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-green-500 font-bold">✅</span>
                    <span>Rank subscriptions by value</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-green-500 font-bold">✅</span>
                    <span>Show exactly how much you're wasting</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-8 text-center">
            <p className="text-lg font-semibold text-foreground mb-2">
              We are the <span className="text-primary">Subscription Optimization Platform</span>
            </p>
            <p className="text-muted-foreground">
              Built for subscription-heavy users who want control, not complexity.
            </p>
          </div>
        </div>
      </section>

      {/* 4️⃣ HOW IT WORKS - SIMPLE 3-STEP */}
      <section className="bg-muted/30 py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 tracking-tight">
              Get Started in 3 Simple Steps
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No complexity. Just results.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative">
                {/* Step number */}
                <div className="flex justify-center mb-8">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-white font-bold text-2xl">
                    {item.step}
                  </div>
                </div>

                {/* Connecting line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[40%] h-1 bg-gradient-to-r from-primary to-transparent" />
                )}

                <Card className="border border-border/50 shadow-md hover:shadow-lg hover:border-primary/50 transition-all">
                  <CardContent className="p-8 text-center">
                    <div className="flex justify-center mb-6">
                      <div className="p-4 rounded-xl bg-primary/10">
                        <item.icon className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5️⃣ FEATURE HIGHLIGHTS */}
      <section className="container mx-auto px-4 py-28">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6 tracking-tight">
            Core Features That Save You Money
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {featureHighlights.map((feature, index) => (
            <Card key={index} className="border border-border/50 shadow-md hover:shadow-lg hover:border-primary/50 transition-all bg-card/50 backdrop-blur hover:bg-card">
              <CardContent className="p-8">
                <div className="text-4xl mb-6">{feature.title.split(' ')[0]}</div>
                <h3 className="text-lg font-bold mb-3">{feature.title.split(' ').slice(1).join(' ')}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 6️⃣ WHY WE'RE DIFFERENT - Comparison */}
      <section id="comparison" className="bg-muted/30 py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 tracking-tight">
              How We Compare
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See what makes Subveris the better choice for subscription management.
            </p>
          </div>

          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-6 font-semibold">Feature</th>
                  <th className="text-center py-4 px-6 font-semibold text-muted-foreground">Other Apps</th>
                  <th className="text-center py-4 px-6 font-semibold text-primary bg-primary/5 rounded-t">Subveris</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row, index) => (
                  <tr key={index} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">{row.feature}</td>
                    <td className="text-center py-4 px-6 text-muted-foreground">{row.others}</td>
                    <td className={`text-center py-4 px-6 font-semibold ${row.us === 'Yes' || row.us === 'High' || row.us === 'Advanced' ? 'text-green-600 bg-green-500/5' : ''}`}>
                      {row.us}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 7️⃣ SOCIAL PROOF - Testimonials */}
      <section className="container mx-auto px-4 py-28">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6 tracking-tight">
            Trusted by Early Optimizers
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real people are already saving thousands. Join them.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { name: "Alex R.", role: "Tech Company CEO", saving: "$480/month", quote: "Finally know exactly what I'm paying for. Cut 12 unused subscriptions in 30 minutes." },
            { name: "Maria S.", role: "Small Business Owner", saving: "$240/month", quote: "The cost-per-use analysis changed how I think about digital tools. Best decision." },
            { name: "James P.", role: "Software Engineer", saving: "$360/month", quote: "Lightweight, privacy-focused, and actually useful. This is how it should be." },
          ].map((testimonial, index) => (
            <Card key={index} className="border border-border/50 shadow-md hover:shadow-lg hover:border-primary/50 transition-all">
              <CardContent className="p-8">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-base text-muted-foreground mb-6 italic leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="border-t border-border/50 pt-4">
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground mb-2">{testimonial.role}</div>
                  <div className="text-sm font-bold text-primary">Saves {testimonial.saving}</div>
                </div>
              </CardContent>
            </Card>
          ))}
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
            <h3 className="text-2xl font-bold mb-4">Trusted by Industry Leaders</h3>
            <p className="text-muted-foreground">
              Join thousands of companies and individuals optimizing their subscriptions
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
            {/* Placeholder for company logos - you can replace with actual logos */}
            <div className="text-lg font-semibold text-muted-foreground">TechCrunch</div>
            <div className="text-lg font-semibold text-muted-foreground">Product Hunt</div>
            <div className="text-lg font-semibold text-muted-foreground">Forbes</div>
            <div className="text-lg font-semibold text-muted-foreground">Wired</div>
            <div className="text-lg font-semibold text-muted-foreground">Business Insider</div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="bg-muted/30 py-28">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-6 tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free. Upgrade anytime. Cancel anytime. No contracts, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {/* FREE PLAN */}
            <Card className="relative flex flex-col transition-all border border-border/50 shadow-md hover:shadow-lg hover:border-primary/30 bg-card/50">
              <CardHeader className="text-center pb-6 pt-8">
                <CardTitle className="text-3xl font-bold">Free</CardTitle>
                <div className="mt-6">
                  <span className="text-5xl font-bold text-foreground">$0</span>
                  <span className="text-muted-foreground ml-2">/month</span>
                </div>
                <CardDescription className="mt-4 text-base">
                  Perfect for getting started with subscription management
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-6">
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Track up to 5 subscriptions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Monthly spending overview</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Basic spending reports</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Manual subscription entry</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Dashboard access</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Email support</span>
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
                  Unlock powerful insights and automation
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
                    <span className="text-sm font-medium">AI-powered recommendations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Behavioral insights & trends</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Savings projections</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Export reports (CSV/PDF)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Priority support</span>
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
                  Share subscriptions with family members
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
                    <span className="text-sm font-medium">Family group management</span>
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
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">Family calendar view</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-purple-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">VIP family support</span>
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
              <span className="font-semibold text-foreground">Average Premium user saves $180/month</span> — that's $90 per year, which pays for Premium 9x over.
            </p>
          </div>

          {/* Feature Comparison Table */}
          <div className="max-w-6xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">Detailed Feature Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
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
                    <td className="py-4 px-6 font-medium">Subscriptions Tracked</td>
                    <td className="text-center py-4 px-6 text-muted-foreground">Up to 5</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5">Unlimited</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5">Unlimited</td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Browser Extension</td>
                    <td className="text-center py-4 px-6"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Cost Per Use Analytics</td>
                    <td className="text-center py-4 px-6"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Usage Tracking</td>
                    <td className="text-center py-4 px-6 text-muted-foreground">Manual only</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5">Automatic</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5">Automatic</td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">AI Recommendations</td>
                    <td className="text-center py-4 px-6"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Behavioral Insights</td>
                    <td className="text-center py-4 px-6"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Savings Projections</td>
                    <td className="text-center py-4 px-6"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Export Reports</td>
                    <td className="text-center py-4 px-6"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                    <td className="text-center py-4 px-6 bg-green-500/5"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Support</td>
                    <td className="text-center py-4 px-6 text-sm text-muted-foreground">Email</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5">Priority</td>
                    <td className="text-center py-4 px-6 font-semibold text-green-600 bg-green-500/5">VIP</td>
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
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium">Family Calendar</td>
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
              Join 50,000+ users who are saving money and gaining control over their recurring spending.
            </p>

            <div className="bg-card/50 border border-border/50 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
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
              <Button size="lg" variant="outline" className="text-lg px-12 py-8 border-2">
                Schedule Demo
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

            <div className="grid md:grid-cols-3 gap-8">
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

              <Card className="border border-border/50 shadow-md hover:shadow-lg transition-all text-center">
                <CardContent className="p-8">
                  <div className="flex justify-center mb-6">
                    <div className="p-4 rounded-xl bg-blue-500/10">
                      <MessageCircle className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3">Live Chat</h3>
                  <p className="text-muted-foreground mb-4">
                    Chat with our support team in real-time during business hours.
                  </p>
                  <Button variant="outline" className="w-full">
                    Start Chat
                  </Button>
                </CardContent>
              </Card>

              <Card className="border border-border/50 shadow-md hover:shadow-lg transition-all text-center">
                <CardContent className="p-8">
                  <div className="flex justify-center mb-6">
                    <div className="p-4 rounded-xl bg-green-500/10">
                      <Bot className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-3">Help Center</h3>
                  <p className="text-muted-foreground mb-4">
                    Browse our comprehensive knowledge base and tutorials.
                  </p>
                  <Button variant="outline" className="w-full">
                    Visit Help Center
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">
                Have a question or need help getting started?
              </p>
              <Link href="/contact">
                <Button variant="outline" size="lg">
                  Contact Support
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/40 bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <span className="text-xl font-bold">Subveris</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                The Subscription Optimization Platform. Take control of your recurring spending with AI-powered insights and real usage tracking.
              </p>

              {/* Contact Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-primary" />
                  <a href="mailto:help.subveris@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">
                    help.subveris@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">24/7 Support Available</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4 mt-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>SOC 2 Certified</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-4 w-4 text-blue-500" />
                  <span>256-bit SSL</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>GDPR Compliant</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#solution" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#comparison" className="hover:text-primary transition-colors">How We Compare</a></li>
                <li><a href="/pricing" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="/docs" className="hover:text-primary transition-colors">Documentation</a></li>
                <li><a href="/security" className="hover:text-primary transition-colors">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4">Support</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="/support" className="hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="/contact" className="hover:text-primary transition-colors">Contact Us</a></li>
                <li><a href="/blog" className="hover:text-primary transition-colors">Blog</a></li>
                <li><a href="/community" className="hover:text-primary transition-colors">Community</a></li>
                <li><a href="mailto:help.subveris@gmail.com" className="hover:text-primary transition-colors">Email Support</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="/about" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="/careers" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="/press" className="hover:text-primary transition-colors">Press Kit</a></li>
                <li><a href="/partners" className="hover:text-primary transition-colors">Partners</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="/cookies" className="hover:text-primary transition-colors">Cookie Policy</a></li>
                <li><a href="/gdpr" className="hover:text-primary transition-colors">GDPR</a></li>
                <li><a href="/security" className="hover:text-primary transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          {/* Newsletter Signup */}
          <div className="border-t border-border/40 pt-8 pb-6">
            <div className="max-w-md mx-auto text-center">
              <h4 className="font-semibold text-sm mb-2">Stay Updated</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Get the latest updates on subscription optimization and new features.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button size="sm" className="px-4">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-xs text-muted-foreground mb-4 md:mb-0">
              © 2025 Subveris. All rights reserved. Made with ❤️ for subscription optimizers worldwide.
            </div>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <a href="https://twitter.com/subveris" className="hover:text-primary transition-colors">Twitter</a>
              <a href="https://linkedin.com/company/subveris" className="hover:text-primary transition-colors">LinkedIn</a>
              <a href="https://github.com/subveris" className="hover:text-primary transition-colors">GitHub</a>
              <a href="mailto:help.subveris@gmail.com" className="hover:text-primary transition-colors">Email</a>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}
