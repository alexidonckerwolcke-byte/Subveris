import { Link } from "wouter";

const cancelPages = [
  { href: "/cancel-netflix", label: "Netflix" },
  { href: "/cancel-spotify", label: "Spotify Premium" },
  { href: "/cancel-amazon-prime", label: "Amazon Prime" },
  { href: "/cancel-disney-plus", label: "Disney Plus" },
  { href: "/cancel-youtube-premium", label: "YouTube Premium" },
  { href: "/cancel-hbo-max", label: "HBO Max" },
  { href: "/cancel-tinder-gold", label: "Tinder Gold" },
  { href: "/cancel-linkedin-premium", label: "LinkedIn Premium" },
  { href: "/cancel-hellofresh", label: "HelloFresh" },
  { href: "/cancel-icloud", label: "iCloud" },
  { href: "/cancel-canva-pro", label: "Canva Pro" },
  { href: "/cancel-microsoft-365", label: "Microsoft 365" },
  { href: "/cancel-nordvpn", label: "NordVPN" },
  { href: "/cancel-playstation-plus", label: "PlayStation Plus" },
  { href: "/cancel-xbox-game-pass", label: "Xbox Game Pass" },
  { href: "/cancel-audible", label: "Audible" },
  { href: "/cancel-readly", label: "Readly" },
  { href: "/cancel-duolingo", label: "Duolingo Plus" },
  { href: "/cancel-viaplay", label: "Viaplay" },
  { href: "/cancel-adobe", label: "Adobe" },
];

export function CancelRelatedGuides({ current }: { current: string }) {
  const related = cancelPages.filter((page) => page.href !== current).slice(0, 4);

  return (
    <section className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-2xl font-semibold tracking-tight">Related cancellation guides</h2>
      <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
        Looking for a different subscription? Use one of these quick guides to cancel popular services without extra fees.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {related.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {page.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

const faqQuestions = [
  {
    question: "How do I cancel %s?",
    answer: "Open the subscription settings for the service, find your active plan, and follow the cancellation steps. If you subscribed through Apple or Google Play, cancel directly through that platform instead of just deleting the app.",
  },
  {
    question: "Will I keep access after I cancel %s?",
    answer: "Yes. Most services let you keep using the subscription until the end of the current billing cycle, even after you cancel.",
  },
  {
    question: "Do I need to delete the app to stop %s from charging me?",
    answer: "No. Deleting the app does not cancel the subscription. You must cancel the plan through the service settings or your app store billing account.",
  },
];

export function CancelPageFaq({ productName }: { productName: string }) {
  return (
    <section id="faq" className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
      <div className="mt-5 space-y-6">
        {faqQuestions.map((faq) => (
          <div key={faq.question}>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{faq.question.replace("%s", productName)}</h3>
            <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
              {faq.answer.replace(/%s/g, productName)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CancelPageJsonLd({ productName, url }: { productName: string; url: string }) {
  const faqs = faqQuestions.map((faq) => ({
    question: faq.question.replace("%s", productName),
    answer: faq.answer.replace(/%s/g, productName),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
    url,
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
