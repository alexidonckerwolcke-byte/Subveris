# Subveris Documentation

Welcome to the official documentation for Subveris, your all-in-one subscription tracking and analytics platform. Use the navigation below to explore each section in detail. Most links open in a new tab for your convenience.

---

## Table of Contents

- [Getting Started](#getting-started)
- [How Subscription Tracking Works](#how-subscription-tracking-works)
- [AI & Accuracy](#ai--accuracy)
- [Managing Your Account](#managing-your-account)
- [FAQ](#faq)
- [Privacy & Data](#privacy--data)
- [Policies](#policies)

---

## Getting Started

Subveris is a modern SaaS platform that helps you track, analyze, and optimize your recurring subscriptions. Whether you have streaming services, SaaS tools, or memberships, Subveris gives you clarity and control.

### What Subveris Does
- **Tracks all your subscriptions** in one place
- **Analyzes usage and cost per use** to help you save money
- **Flags inactive subscriptions** and suggests cancellations
- **Integrates with Stripe** for secure premium payments
- **Provides actionable insights** to optimize your spending

### What Subveris Does NOT Do
- Does **not** access your bank account directly
- Does **not** cancel subscriptions automatically (you must confirm cancellations)
- Does **not** process payments for your subscriptions (only for premium features)
- Is **not** a budgeting or investment tool

### Who Is It For?
- Individuals with multiple recurring payments
- Families or teams sharing subscriptions
- Anyone wanting to reduce wasted spend on unused services

### Quick Start Guide
1. **Sign up** for a free account
2. **Add your subscriptions** manually or via supported integrations
3. **Explore your dashboard** for analytics and recommendations
4. **Upgrade to premium** for advanced features (optional)

For a detailed onboarding walkthrough, see [Getting Started Guide](#getting-started-guide){:target="_blank"}.

---

## How Subscription Tracking Works

Subveris uses a combination of user input, smart analytics, and optional integrations to provide a comprehensive view of your subscriptions.

### Workflow Overview
1. **Add Subscriptions:** Enter details such as name, cost, renewal date, and category.
2. **Track Usage:** Log usage manually or connect supported integrations (where available).
3. **Analyze:** View cost per use, monthly spend, and get recommendations.
4. **Take Action:** Cancel, upgrade, or adjust subscriptions as needed.

### Feature Logic
- **Automatic Status Changes:** Subscriptions with zero monthly usage are flagged and can be set to "inactive" automatically.
- **Cost Per Use Analytics:** Calculates how much value you get from each subscription.
- **Premium Feature Reset:** Canceling premium disables advanced analytics and prevents further Stripe billing.
- **Stripe Webhook Integration:** Ensures your premium status and billing are always in sync with your Stripe account.

### AI Limitations
- AI recommendations are based on your input and available usage data.
- Subveris cannot access or analyze your bank transactions directly.
- AI cannot cancel subscriptions for you; it can only suggest actions.

### Required Inputs
- Subscription details (name, cost, renewal date, category)
- Usage data (manual entry or via integrations)

For more technical details, see [How It Works](#how-it-works){:target="_blank"}.

---

## AI & Accuracy

Subveris uses rule-based logic and, where available, AI-powered suggestions to help you optimize your subscriptions.

### How Accurate Are the Analytics?
- Analytics are only as accurate as the data you provide.
- Integrations (where available) can improve accuracy by automating usage tracking.
- AI suggestions are transparent and explainable—no "black box" decisions.

### Limitations
- Manual data entry may lead to incomplete analytics.
- AI cannot predict future price changes or service disruptions.
- Recommendations are suggestions, not financial advice.

For more, see [AI & Accuracy Details](#ai--accuracy-details){:target="_blank"}.

---

## Managing Your Account

### Account Creation & Login
- Sign up with email and password
- Secure authentication via Supabase

### Upgrading to Premium
- Premium features are unlocked via Stripe payment
- You can upgrade or downgrade at any time
- Canceling premium disables advanced features immediately and stops future billing

### Managing Subscriptions
- Add, edit, or remove subscriptions from your dashboard
- Set reminders for renewal dates
- Track usage and spending trends

### Account Settings
- Update your email or password
- **Choose a preferred currency** – the app will remember your selection so your amounts
  stay consistent across devices and future sign‑ins
- Delete your account (all data is permanently removed)
- Manage notification preferences

For step-by-step instructions, see [Account Management Guide](#account-management-guide){:target="_blank"}.

> **Note:** In the **Files** section of the app you may occasionally be prompted to pay a small fee (around €5) to enable *developer mode*. This charge is required by some platforms before advanced export or debugging features can be unlocked.

---

## FAQ

### Pricing
- **Is Subveris free?**
  - Yes, there is a free tier with core features. Premium features require a subscription via Stripe.
- **How do I upgrade or cancel?**
  - Go to Account Settings > Billing. Canceling premium stops future charges immediately.

### Account Management
- **How do I reset my password?**
  - Use the "Forgot Password" link on the login page.
- **Can I delete my account?**
  - Yes, from Account Settings. This action is irreversible.

### Data & Privacy
- **Is my data secure?**
  - Yes. All data is encrypted and never sold or shared.
- **Can I export my data?**
  - Yes, export options are available in Account Settings.

### Troubleshooting
- **I can't log in!**
  - Check your email and password, or use "Forgot Password".
- **Premium features disappeared after payment?**
  - Contact support with your payment receipt for assistance.

### Limitations
- Subveris cannot access your bank account or cancel subscriptions for you.
- Analytics depend on the accuracy of your input data.

For more, see [Full FAQ](#full-faq){:target="_blank"}.

---

## Privacy & Data

### Data Handling
- All user data is encrypted at rest and in transit
- We do not share or sell your data
- Payment information is handled securely via Stripe

### Data Usage
- Data is used only to provide analytics and recommendations
- You can export or delete your data at any time

For full details, see [Privacy Policy](#privacy-policy){:target="_blank"}.

---

## Policies

- [Privacy Policy](#privacy-policy){:target="_blank"}
- [Terms of Service](#terms-of-service){:target="_blank"}
- [Refund Policy](#refund-policy){:target="_blank"}

### Privacy Policy
We respect your privacy. All data is encrypted and never shared with third parties. Personal information is only used to provide the service and improve your experience; we do not sell, rent, or otherwise monetize your data. You can request a copy of your data at any time or ask for it to be permanently deleted. See the full [Privacy Policy](#privacy-policy){:target="_blank"} for details.

### Terms of Service
By using Subveris, you agree to our terms. These cover acceptable use of the platform, intellectual property, disclaimers of warranty, and limitations of liability. Please read them carefully to understand your rights and responsibilities. See the full [Terms of Service](#terms-of-service){:target="_blank"}.

### Refund Policy
Refunds are available for premium subscriptions within 14 days of purchase. We evaluate each refund request on a case-by-case basis and may require proof of purchase. After the refund window, partial refunds may be considered for exceptional circumstances. See the [Refund Policy](#refund-policy){:target="_blank"} for more information.

---

For further help, contact our support team or visit the [Help Center](#help-center){:target="_blank"}.
