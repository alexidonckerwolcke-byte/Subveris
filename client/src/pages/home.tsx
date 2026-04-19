import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthModal } from "@/components/auth-modal";
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

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden shadow-sm">
              <img src="/assets/logo.png" alt="Subveris Logo" className="h-full w-full object-cover" />
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

          <div className="flex items-center gap-4">
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
          </div>

          {/* Social Proof Stats */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-12 text-sm mb-12">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">50K+</div>
              <div className="text-muted-foreground">People Optimizing</div>
            </div>
            <div className="w-px h-8 bg-border hidden sm:block" />
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">$120</div>
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
              Subscriptions are designed to be forgotten.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Companies spend millions making it easy to sign up and impossible to track value. We're leveling the playing field.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {problems.map((item, index) => (
              <div key={index} className="bg-background p-8 rounded-2xl shadow-sm border border-border/50 hover:shadow-md transition-all group">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-lg font-medium leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3️⃣ FEATURES SECTION */}
      <section id="features" className="container mx-auto px-4 py-28">
        <div className="max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-6 border-primary text-primary px-4 py-1">Features</Badge>
          <h2 className="text-5xl font-bold mb-8 tracking-tight">Everything you need to stop overpaying.</h2>
          <div className="grid md:grid-cols-3 gap-10">
            {featureHighlights.map((feature, index) => (
              <div key={index} className="flex flex-col gap-6">
                <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
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
            <h2 className="text-5xl font-bold mb-6 tracking-tight">Why Subveris?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Most "subscription managers" just read your bank transactions. We track actual usage.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-background rounded-3xl shadow-xl border border-border/50 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-8 text-lg font-bold">Feature</th>
                  <th className="p-8 text-lg font-bold text-muted-foreground text-center">Others</th>
                  <th className="p-8 text-lg font-bold text-primary text-center bg-primary/5">Subveris</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((item, index) => (
                  <tr key={index} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-8 font-medium">{item.feature}</td>
                    <td className="p-8 text-center text-muted-foreground">{item.others}</td>
                    <td className="p-8 text-center font-bold text-primary bg-primary/5">{item.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5️⃣ TESTIMONIALS SECTION */}
      <section className="container mx-auto px-4 py-28">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6 tracking-tight">Loved by 50,000+ users</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              name: "Sarah Jenkins",
              role: "Freelance Designer",
              quote: "Subveris showed me I was paying for three different stock photo sites but only using one. Saved me $45/month instantly.",
              saving: "$540/year"
            },
            {
              name: "Michael Chen",
              role: "Software Engineer",
              quote: "The cost-per-use feature is a game changer. It made me realize my 'cheap' $10 streaming service was costing me $5 per movie.",
              saving: "$210/year"
            },
            {
              name: "Emma Rodriguez",
              role: "Marketing Manager",
              quote: "I love the privacy focus. No bank connection needed, just real insights into my digital spending habits.",
              saving: "$380/year"
            }
          ].map((testimonial, index) => (
            <Card key={index} className="border-border/50 shadow-md hover:shadow-xl transition-all bg-card/50">
              <CardContent className="pt-8">
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
              <span className="font-semibold text-foreground">Average Premium user saves $120/month</span> — that's $1,440 per year.
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
                    <td className="text-center py-4 px-6 text-muted-foreground">Up to 2 subscriptions</td>
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
                    <td className="text-center py-4 px-6 font-semibold text-purple-600 bg-purple-500/5">VIP</td>
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
                <img src="/assets/logo.png" alt="Subveris Logo" className="h-full w-full object-cover" />
              </div>
              <span className="text-lg font-bold tracking-tight">Subveris</span>
            </div>
            
            <nav className="flex flex-wrap justify-center gap-8 text-sm font-medium text-muted-foreground">
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/security" className="hover:text-foreground transition-colors">Security</a>
              <a href="/docs" className="hover:text-foreground transition-colors">Cookies</a>
            </nav>

            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Subveris. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}
