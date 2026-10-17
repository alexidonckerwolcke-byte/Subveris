import { Link } from "wouter";
import { PRODUCT_POSITIONING } from "@/lib/product-positioning";

export const cancelPages = [
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
  { href: "/cancel-custom", label: "Other subscriptions" },
];

export function CancelRelatedGuides({ current }: { current: string }) {
  const currentIndex = cancelPages.findIndex((page) => page.href === current);
  const related = Array.from({ length: Math.min(4, cancelPages.length - 1) }, (_, index) =>
    cancelPages[(currentIndex + index + 1 + cancelPages.length) % cancelPages.length]
  ).filter((page) => page.href !== current);

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
      <div className="mt-7 border-t border-slate-200 pt-5 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">More subscription resources</h3>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <Link href="/best-subscription-trackers" className="font-medium text-emerald-800 underline decoration-emerald-800/30 underline-offset-4 hover:decoration-emerald-800 dark:text-emerald-300">
            Compare subscription trackers and optimizers
          </Link>
          <Link href="/why-subveris-best-subscription-manager" className="font-medium text-emerald-800 underline decoration-emerald-800/30 underline-offset-4 hover:decoration-emerald-800 dark:text-emerald-300">
            Read our Subveris product review
          </Link>
        </div>
      </div>
    </section>
  );
}

interface CancellationFaq {
  question: string;
  answer: string;
}

interface CancellationDetails {
  billingSource: string;
  confirmation: string;
  troubleshooting: string;
}

const cancellationDetails: Record<string, CancellationDetails> = {
  Netflix: {
    billingSource: "Start in Netflix Account under Membership & Billing. If Netflix identifies a partner as the biller, manage the plan with that partner instead; the receipt or card statement can help identify it.",
    confirmation: "Return to Membership & Billing and check that the account shows the membership end date or canceled state. Keep the confirmation email, and check again if the page still shows a next billing date.",
    troubleshooting: "If Cancel Membership is missing, check whether the plan is already canceled, prepaid, or billed through a provider. Confirm the active Netflix account before contacting the biller.",
  },
  "Spotify Premium": {
    billingSource: "Open Spotify Account and review Your plan. If Premium is managed by a partner, Spotify identifies that partner there; cancellations for partner-billed plans must go through the partner.",
    confirmation: "Check Your plan for the resulting plan state and next billing date. If it changes to Spotify Free, Premium billing has ended; keep any confirmation email as a record.",
    troubleshooting: "If the plan is not listed, verify you are signed into the Spotify account receiving the charge and inspect the payment receipt for a partner or app-store biller.",
  },
  "Amazon Prime": {
    billingSource: "Open the Prime Membership or Memberships & Subscriptions page while signed into the Amazon account shown on the charge. If a separate provider bills the membership, use that provider's account.",
    confirmation: "Return to the Prime membership page and check that automatic renewal is off and note the end date. Keep Amazon's confirmation email; refund eligibility is shown by Amazon and varies by usage and region.",
    troubleshooting: "If End Membership is unavailable, verify the account and whether the plan is part of a promotion, household, or third-party package. Use the biller shown on the receipt for help.",
  },
  "Disney Plus": {
    billingSource: "Check Account > Subscription to see who manages the plan. Cancel directly with Disney only when Disney is the biller; bundles, app stores, and other partners control plans they sell.",
    confirmation: "After confirming, revisit the subscription page and note the expiration date or canceled state. Keep the email receipt and verify that the plan no longer shows an upcoming renewal.",
    troubleshooting: "If Disney does not show a cancellation control, use the biller named on the payment receipt. For a bundle, check whether canceling Disney also changes other included services.",
  },
  "YouTube Premium": {
    billingSource: "Check Google Account > Payments & subscriptions or YouTube's paid memberships page. If the membership is billed by Apple or another partner, cancel it in that provider's subscription settings.",
    confirmation: "Reopen paid memberships and verify the end date or canceled state. Do not rely on uninstalling YouTube; keep the confirmation message until the last paid day passes.",
    troubleshooting: "If Premium is not listed, check the Google account used for the charge and the receipt's biller. Family-plan managers and individual members may see different controls.",
  },
  "HBO Max": {
    billingSource: "Open the profile's Subscription or Manage Subscription settings. If the page says billing is through Apple, Google Play, a TV provider, or another partner, cancel with that biller instead.",
    confirmation: "Check the subscription page for the plan's end date or canceled status and save the confirmation. Recheck the account belonging to the billing provider if the HBO Max page cannot manage the plan.",
    troubleshooting: "A missing Manage Subscription option usually means another company controls billing. Check the card statement or receipt before contacting support so you reach the correct provider.",
  },
  "Tinder Gold": {
    billingSource: "Use the billing route that sold the plan: Tinder's account settings for direct billing, Apple Subscriptions for an Apple purchase, or Google Play Subscriptions for a Play purchase.",
    confirmation: "Return to the same billing provider and verify Tinder no longer has a next renewal date. Deleting the app or profile is not a cancellation confirmation.",
    troubleshooting: "If Tinder is absent from Apple and Google Play, check Tinder's web account and the original receipt. The store account that made the purchase must manage store-billed plans.",
  },
  "LinkedIn Premium": {
    billingSource: "Open LinkedIn's Premium subscription settings. If the purchase appears under Apple subscriptions or another app-store receipt, cancel through that store rather than LinkedIn's website.",
    confirmation: "Reopen Premium subscription settings and verify the renewal is off and record the access end date. Review any InMail or other plan-specific entitlements shown during cancellation before confirming.",
    troubleshooting: "If LinkedIn offers no cancel action, check whether the plan is managed by Apple, an employer, or another organization. Use the original purchase receipt to identify the account owner.",
  },
  HelloFresh: {
    billingSource: "Open Plan Settings for the specific meal plan you want to stop. Pausing or skipping one delivery is different from canceling the recurring plan; check every active plan on the account.",
    confirmation: "Use the next-order deadline displayed in your account for your location. After cancellation, verify the plan is inactive and no upcoming box remains scheduled; keep the confirmation email.",
    troubleshooting: "Delivery cutoffs vary by market and order schedule, so do not rely on a universal number of days. If a box is still scheduled, contact HelloFresh before the deadline shown for that order.",
  },
  "iCloud": {
    billingSource: "On Apple devices, open Settings > your Apple Account > iCloud > Manage Account Storage or Manage Storage, then review the storage plan options. Apple manages iCloud+ billing.",
    confirmation: "Check that the selected plan and effective date changed. Before downgrading, compare your stored data with the new capacity; backups and syncing can be affected if usage exceeds the plan.",
    troubleshooting: "If the plan change is unavailable, confirm you are using the Apple Account that owns the subscription and retry from its device settings. Do not delete backups as a substitute for changing the plan.",
  },
  "Canva Pro": {
    billingSource: "Open Canva account settings > Billing & plans. For a team plan, the team owner or billing admin may need to make the change; app-store purchases must be managed in that store.",
    confirmation: "Check Billing & plans for the plan's end date or Free status and save the confirmation. Review which team features, brand assets, and storage change before the downgrade takes effect.",
    troubleshooting: "If you cannot see billing controls, verify you are the team owner or billing admin and check the original purchase receipt for an app-store biller.",
  },
  "Microsoft 365": {
    billingSource: "Open Microsoft Account > Services & subscriptions for a personal plan. Work or school subscriptions may be controlled by an organization's administrator; reseller or app-store purchases are managed by that seller.",
    confirmation: "Check the subscription page for the recurring-billing state and expiration date. Turning off recurring billing typically stops renewal rather than ending access immediately; follow the exact state shown for your plan.",
    troubleshooting: "If Manage or Cancel is missing, confirm the Microsoft account that receives the charge and whether the plan belongs to an organization, reseller, or app store.",
  },
  Adobe: {
    billingSource: "Open Adobe Account > Plans and review the exact plan and billing term before choosing Cancel your plan. App-store purchases must be canceled with Apple or Google Play.",
    confirmation: "Read the final cancellation screen for any fee, access end date, and effective date before confirming. Afterward, check Plans for a canceled state and keep Adobe's confirmation email.",
    troubleshooting: "If the displayed fee or commitment is unclear, stop before confirming and ask Adobe support to explain the amount for your specific plan. Do not switch plans as a workaround without reviewing the new commitment.",
  },
  "PlayStation Plus": {
    billingSource: "Use the PlayStation account that purchased the membership and open Account Management > Subscription or Services. Manage recurring billing from that account on the web or console.",
    confirmation: "Check the subscription page for the renewal setting and paid-through date, then keep the confirmation. Turning off auto-renewal generally leaves access until the date shown.",
    troubleshooting: "If the membership is not visible, check the PlayStation account that received the receipt and whether it is a family-managed account before contacting PlayStation support.",
  },
  "Xbox Game Pass": {
    billingSource: "Sign into the Microsoft account that owns Game Pass and open Services & subscriptions. Follow the option shown for that plan; turning off recurring billing and ending access immediately are not always the same choice.",
    confirmation: "Return to Services & subscriptions and verify recurring billing is off or the subscription is canceled, then note the expiration date shown.",
    troubleshooting: "If Game Pass is missing, confirm the account that bought it and check any console-store or promotional receipt. Do not assume removing the Xbox profile or app stops billing.",
  },
  Audible: {
    billingSource: "Open Audible Account Details > Membership details for a direct Audible membership. If Apple or another partner billed it, use that provider's subscription settings.",
    confirmation: "Check Membership details for the end date or canceled state and keep the email. Before confirming, review the on-screen terms for unused credits; their treatment can depend on the plan, offer, and marketplace.",
    troubleshooting: "If membership controls are missing, check the marketplace and account shown on the last Audible receipt. Contact that biller before assuming the membership is canceled.",
  },
  Readly: {
    billingSource: "Open Readly's account subscription settings. If the receipt shows Apple, Google Play, or another reseller as the biller, manage the subscription there instead.",
    confirmation: "Verify the account displays a canceled state or end date and retain the confirmation. Use the cutoff shown in your account; do not assume a universal 24-hour rule.",
    troubleshooting: "If the cancel option is missing or a renewal is still listed, check the active Readly account and original payment receipt, then contact the named billing provider before renewal.",
  },
  "Duolingo Plus": {
    billingSource: "For direct billing, open Duolingo settings and manage the Super Duolingo or Plus plan. If Apple or Google Play billed the purchase, cancel it from that store's Subscriptions page.",
    confirmation: "Check the same billing source for the paid plan's end date or canceled status. Your Duolingo login is separate from the paid plan; verify you can still access the account you intend to keep.",
    troubleshooting: "If Duolingo does not show billing controls, check the app-store account used at signup and the receipt. Do not delete your Duolingo account to stop a subscription.",
  },
  Viaplay: {
    billingSource: "Check My Account or Subscription to see whether Viaplay or a TV/mobile partner bills the plan. Provider-billed packages must be canceled in that provider's customer portal.",
    confirmation: "Verify the same account or provider shows auto-renewal off and the access end date. Keep the confirmation email or reference number.",
    troubleshooting: "If the Viaplay page has no cancellation control, compare the biller on your statement with the account provider. Canceling in the app will not necessarily stop a bundled package.",
  },
};

export function getCancelGuideFaqs(productName: string): CancellationFaq[] {
  const details = cancellationDetails[productName];
  if (!details) {
    return [
      { question: `Where should I cancel ${productName}?`, answer: "Use the billing account shown on the latest receipt. If an app store, carrier, bundle, or reseller charged you, cancel with that provider rather than only uninstalling the app." },
      { question: `How do I confirm ${productName} is canceled?`, answer: "Return to the same billing account and verify its canceled or non-renewing state and effective date. Keep the confirmation email or screenshot." },
      { question: `What if I cannot find cancellation settings for ${productName}?`, answer: "Check which account and provider issued the charge, then contact that billing provider before the displayed renewal date." },
    ];
  }

  return [
    { question: `Where should I cancel ${productName}?`, answer: details.billingSource },
    { question: `How do I confirm ${productName} is canceled?`, answer: details.confirmation },
    { question: `What if I cannot complete cancellation for ${productName}?`, answer: details.troubleshooting },
  ];
}

export function getProductWhyCopy(productName: string) {
  const copy: Record<string, string> = {
    Netflix: "Netflix is one of the easiest subscriptions to keep on autopilot, which is why so many people forget to cancel before the next billing cycle. It is often a short-term pause, not a permanent breakup, and the best move is to cancel before the renewal hits.",
    "Spotify Premium": "Spotify Premium is often canceled when a person switches to a family plan, another streaming service, or simply stops listening enough to justify the fee. It is a classic case of a monthly subscription that keeps running quietly after the habit changes.",
    "Amazon Prime": "Amazon Prime is easy to keep because it blends convenience and shipping benefits, but many people cancel once the free delivery value drops or they stop using Prime Video. The hard part is often knowing where the renewal is attached in the account.",
    "Disney Plus": "Disney Plus is commonly canceled after a season ends, a bundle expires, or a family no longer watches enough to justify the monthly fee. The key is confirming the exact account and billing date before the next renewal.",
    "YouTube Premium": "YouTube Premium is frequently forgotten because it is tied to a Google account and often sits unused alongside other subscription tools. The best cancellation decision usually comes after a period of lower usage or a switch to another music service.",
    "HBO Max": "HBO Max often gets canceled after a specific series ends or when a person decides to keep their budget tighter. It is one of those subscriptions that feels harmless until it renews again without much thought.",
    "Tinder Gold": "Tinder Gold is a classic example of a low-cost app subscription that gets forgotten after a dating break or a change in relationship status. Many people keep paying because they do not revisit the billing page regularly enough.",
    "LinkedIn Premium": "LinkedIn Premium is often canceled during a career transition or after someone decides they no longer need weekly job tools. The renewal is easy to overlook because the service feels helpful while you are actively job hunting.",
    "HelloFresh": "HelloFresh is often canceled because it is tied to meal plans and delivery frequency, not just a flat monthly habit. People tend to pause or cancel it when their schedule changes, they cook less, or a cheaper option takes over.",
    "iCloud": "iCloud storage is often kept around long after it is needed because people forget the plan is tied to a device backup and Apple account. Many cancellations happen after someone has cleaned up storage or moved to a cheaper alternative.",
    "Canva Pro": "Canva Pro is usually canceled after a design project ends or when someone no longer uses advanced templates and branding tools. The subscription feels easy to keep until the renewal reminder appears and the real value is reassessed.",
    "Microsoft 365": "Microsoft 365 is commonly canceled when a person no longer needs premium Office features or is switching to a cheaper alternative. The main issue is identifying whether the subscription is tied to Microsoft, a family account, or an app store purchase.",
    "NordVPN": "NordVPN is often kept during travel or occasional privacy use, then forgotten once the original reason disappears. It is a good example of a service that remains active because the billing is easy to miss until the next charge.",
    "PlayStation Plus": "PlayStation Plus is often left active after a gaming break or when a user is no longer playing online regularly. The problem is that the subscription stays attached to the account even when the gaming habit changes.",
    "Xbox Game Pass": "Xbox Game Pass is frequently canceled after a gaming cycle ends, when a player is no longer actively using the service, or when a cheaper plan becomes more convenient. It is easy to forget because the renewal is linked to the platform account.",
    "Audible": "Audible is commonly canceled when the credit is not used, the listening habit changes, or another audiobook service becomes more relevant. A lot of people accidentally keep paying because they do not revisit the membership page often enough.",
    "Readly": "Readly is usually canceled when the reading habit slows down or the monthly fee feels less justified. It is another classic low-effort subscription that keeps renewing simply because it is easy to forget.",
    "Duolingo Plus": "Duolingo Plus is often canceled after a language learning break or when the user decides they can keep learning on the free plan. It is a service people keep for a while without rechecking whether the paid plan still fits their routine.",
    "Viaplay": "Viaplay often gets canceled after a season ends, a sports interest drops, or a bundle no longer feels worth the monthly fee. The most common issue is not the app itself, but the silent renewal that keeps running after the habit changes.",
    Adobe: "Adobe is a common subscription to cancel when the user has fewer creative projects, wants to cut costs, or is switching to a cheaper alternative. The problem is often not the product itself, but the fact that the renewal is easy to lose track of.",
  };

  return copy[productName] ?? "This service is a common subscription to cancel when usage drops, the monthly cost feels too high, or you are no longer getting enough value from the plan.";
}

export function getProductSidebarCopy(productName: string) {
  const copy: Record<string, string> = {
    Netflix: "Netflix is one of the easiest subscriptions to forget about because it feels low-friction and often sits on an account long after the watch habits change. Tracking it in one place makes it much easier to spot the renewal and stop the charge before it happens.",
    "Spotify Premium": "Spotify Premium is easy to keep paying for when music habits change, but the account still stays active. Seeing all recurring payments together makes it far easier to decide whether you still use the service enough to justify the fee.",
    "Amazon Prime": "Amazon Prime blends shipping, video, and convenience into one recurring charge, which is why it can hide in plain sight. A clear subscription overview helps you decide whether the value is still worth it each month.",
    "Disney Plus": "Disney Plus often stays on the account because it is tied to family watching patterns and seasonal content. A subscription dashboard helps you see whether the service still earns its place in your monthly budget.",
    "YouTube Premium": "YouTube Premium is easy to keep because the app is always there and the billing is tied to a Google account. Tracking subscriptions in one place helps you decide whether the premium tier still provides enough everyday value.",
    "HBO Max": "HBO Max can stay active long after the last binge because the membership is easy to set and forget. A single subscription view makes it clear whether the plan is still worth the monthly cost.",
    "Tinder Gold": "Tinder Gold often keeps renewing because the app still sits in the account even when dating habits change. A clear overview helps you catch the renewal before it becomes a habit that keeps draining your budget.",
    "LinkedIn Premium": "LinkedIn Premium is easiest to forget during a career pause or after a job search ends. Subscription tracking makes it simpler to decide whether the benefit still matters before the next renewal.",
    "HelloFresh": "HelloFresh is a recurring subscription that can quietly continue if meal planning changes. Seeing it beside your other charges makes it easier to decide whether the convenience still outweighs the cost.",
    "iCloud": "iCloud storage is one of those plans people forget because it is tied to devices and backups rather than daily use. A good subscription overview helps you decide whether you still need the extra storage before the cycle renews.",
    "Canva Pro": "Canva Pro can quietly stay active after a project ends because the plan is attached to a design workflow rather than a dedicated monthly habit. Tracking it helps you remove costs that no longer match your current needs.",
    "Microsoft 365": "Microsoft 365 often continues because it is connected to work habits and family devices, not just one personal decision. Subscription tracking makes it much easier to spot when the plan is no longer providing enough value.",
    "NordVPN": "NordVPN is easy to keep using when travel or privacy needs come and go, but the billing still continues. Seeing the full renewal picture helps you decide whether it still earns its place in your monthly plan.",
    "PlayStation Plus": "PlayStation Plus often stays active long after the gaming habit changes, especially when the account is used by a household. Tracking those renewals makes it much easier to stop costs that no longer match your routine.",
    "Xbox Game Pass": "Xbox Game Pass is a service people often keep while they are in a gaming cycle and forget to review after the cycle ends. A clean subscription overview helps you cut it off before the next billing date.",
    "Audible": "Audible can be easy to keep paying for when the habit is irregular and the renewal is not reviewed often. A central subscription dashboard helps you decide whether the credit and library still add enough value to justify the cost.",
    "Readly": "Readly is an easy subscription to forget because it is tied to a reading habit that changes over time. Seeing it alongside your other recurring costs makes it clear whether you still use it enough to keep it.",
    "Duolingo Plus": "Duolingo Plus often survives on the account long after the language habit fades. Looking at all subscriptions together makes it easier to decide whether the premium version still matches your routine.",
    "Viaplay": "Viaplay is a subscription that often keeps running after the sports season or entertainment habit fades. When you review all recurring charges together, it becomes much easier to decide whether it is still worth the price.",
    Adobe: "Adobe plans are easy to keep because they blend productivity and creative tools into a single recurring cost. Subscription tracking makes it simpler to see when the plan no longer matches your actual usage.",
  };

  return copy[productName] ?? "It is easy to forget recurring charges when they are connected to a service you use only occasionally. A subscription dashboard makes it easier to decide whether the plan still earns its place in your monthly budget.";
}

export function getProductIntro(productName: string) {
  const copy: Record<string, string> = {
    Netflix: "A few euros here, ten euros there. Before you know it, you are paying for subscriptions you barely use. Canceling Netflix is simple, and this guide shows you exactly how to do it.",
    "Spotify Premium": "Music streaming is easy to keep paying for long after your habits change. This guide walks you through canceling Spotify Premium quickly, whether you are switching services or just cutting costs.",
    "Amazon Prime": "If Prime is no longer worth the monthly fee, this guide walks you through canceling Amazon Prime and stopping future renewals.",
    "Disney Plus": "Disney Plus is tempting to keep around for the occasional family movie night, but the monthly cost adds up. Here is how to cancel without hassle and keep any remaining access you have paid for.",
    "YouTube Premium": "Tired of paying for ad-free viewing or ready to switch back to the free version of YouTube? Canceling YouTube Premium is quick and can be done from any device.",
    "HBO Max": "HBO Max is easy to keep after a binge-watch ends. This guide shows you how to cancel the subscription and avoid being charged again when you are not using the service.",
    "Tinder Gold": "Dating app subscriptions like Tinder Gold are notorious for lingering in your billing long after you stop using them. Here is the simple way to turn it off before the next charge hits.",
    "LinkedIn Premium": "LinkedIn Premium can quietly renew even after your job search ends or your career moves in a different direction. This guide shows you exactly how to cancel and take control of the charge.",
    "HelloFresh": "Meal-kit subscriptions like HelloFresh can pile up costs fast when plans change or schedules get busier. Here is how to cancel cleanly without getting stuck with surprise deliveries or charges.",
    "iCloud": "iCloud+ storage can stay active long after you have actually needed the extra space. This guide shows how to cancel the plan and manage your storage without paying for upgrades you do not use.",
    "Canva Pro": "Canva Pro is one of those subscriptions that feels free until the next charge appears. This guide walks you through canceling so you can keep using the free design tools or explore cheaper alternatives.",
    "Microsoft 365": "Microsoft 365 bundles office tools and cloud storage in a way that feels hard to quit, but canceling is straightforward. Here is how to stop the charge and decide whether you actually need the premium tier.",
    "NordVPN": "VPN subscriptions like NordVPN are easy to justify for travel, then forget about when you stay home. This guide shows how to cancel the auto-renewal and take back control of your subscription.",
    "PlayStation Plus": "Gaming subscriptions can stay active long after you have moved on to other hobbies or games. This guide shows you how to cancel PlayStation Plus without losing access to games you have already purchased.",
    "Xbox Game Pass": "Xbox Game Pass is tempting to keep between gaming cycles, but it is easy to set and forget. Here is how to cancel and make sure you are not charged when you are not actively playing.",
    "Audible": "Audiobook subscriptions like Audible renew quietly each month, often with unused credits piling up. This guide shows you how to cancel the membership and decide whether to keep your existing credits.",
    "Readly": "Magazine subscriptions like Readly are easy to forget because the charge feels so small. This guide walks you through canceling so you can redirect that monthly cost elsewhere.",
    "Duolingo Plus": "Language learning subscriptions like Duolingo Plus often outlive the motivation that started them. Here is how to cancel the plan and stay learning with the free version or a different approach.",
    "Viaplay": "Streaming services like Viaplay are often forgotten after a sports season or favorite show ends. This guide shows how to cancel the subscription and avoid a surprise charge next month.",
    Adobe: "Adobe subscriptions are notoriously sticky, blending multiple tools into one expensive plan. This guide walks you through canceling Adobe and shows your options for staying creative without the price tag.",
  };

  return copy[productName] ?? "This guide walks you through the cancellation process step by step, so you can stop paying for a service you no longer need.";
}

export function getProductBadge(productName: string) {
  const copy: Record<string, string> = {
    Netflix: "Entertainment savings guide",
    "Spotify Premium": "Music & audio guide",
    "Amazon Prime": "Consumer finance guide",
    "Disney Plus": "Streaming services guide",
    "YouTube Premium": "Tech subscription guide",
    "HBO Max": "Entertainment savings guide",
    "Tinder Gold": "Dating apps guide",
    "LinkedIn Premium": "Career tools guide",
    "HelloFresh": "Food & wellness guide",
    "iCloud": "Cloud storage guide",
    "Canva Pro": "Design tools guide",
    "Microsoft 365": "Productivity suite guide",
    "NordVPN": "Privacy & security guide",
    "PlayStation Plus": "Gaming subscriptions guide",
    "Xbox Game Pass": "Gaming subscriptions guide",
    "Audible": "Book & audio guide",
    "Readly": "Magazine subscriptions guide",
    "Duolingo Plus": "Learning tools guide",
    "Viaplay": "Streaming services guide",
    Adobe: "Creative software guide",
  };

  return copy[productName] ?? "Subscription savings guide";
}

const productInsights: Record<string, string> = {
  Netflix: "Netflix is one of the easiest subscriptions to leave on autopilot, which is why people often forget to cancel before the next billing cycle. This guide focuses on the exact cancellation path and how to avoid losing access before the current month is over.",
  "Spotify Premium": "Spotify Premium is commonly canceled when the user switches to a family plan, another service, or a cheaper free tier. The real trap is assuming the app change stops the charge — you still need to cancel the paid plan itself.",
  "Amazon Prime": "Amazon Prime is easy to keep subscribed to out of habit, especially if you use the free shipping perk occasionally. The main thing here is checking whether the renewal is attached to your Amazon account, app store account, or a bundled plan.",
  "Disney Plus": "Disney Plus is often canceled after a season ends or a bundle expires, but many people still get charged because the plan is tied to account settings rather than the app itself. This page helps you confirm the billing date and stop the renewal cleanly.",
  "YouTube Premium": "YouTube Premium is frequently forgotten because it is tied to a Google account and often used alongside other Google services. The best cancellation flow is the one that confirms the membership is truly off before the next billing date.",
  "HBO Max": "HBO Max is often used for a single series or short campaign, which makes it a common 'set and forget' subscription. The key is checking whether the plan is still active and confirming the cancellation in the account settings rather than just logging out.",
  "Tinder Gold": "Tinder Gold tends to linger because it feels low-cost and easy to forget. The risk is that it keeps renewing quietly even after someone stops using the app, so the best move is to cancel in the account billing section instead of just deleting the app.",
  "LinkedIn Premium": "LinkedIn Premium is often paid for with a monthly plan that people forget to revisit after job changes or short-term career periods. This guide focuses on the account settings route so you can stop the renewal without losing access early.",
  "HelloFresh": "HelloFresh is a common subscription to forget because it is tied to weekly deliveries, not a simple monthly charge. Canceling early is usually the best move if you want to avoid the next order or hidden renewal.",
  "iCloud": "iCloud storage is easy to keep paying for without realizing it because the plan is often tied to a device backup and Apple ID. This page helps you confirm whether the storage upgrade is active and how to stop the charge cleanly.",
  "Canva Pro": "Canva Pro is often renewed automatically after a design sprint or seasonal project ends. A lot of people assume a browser sign-out cancels it, but the real stop point is the billing section attached to the Canva account.",
  "Microsoft 365": "Microsoft 365 is often renewed through a subscription cycle without someone realizing they no longer need the full plan. This guide helps you confirm whether the charge is attached to Microsoft, the app store, or a family account before you cancel it.",
  "NordVPN": "NordVPN is a classic example of a service people keep because it feels useful only during travel or occasional privacy checks. The real win is canceling the plan before renewal rather than just uninstalling the app.",
  "PlayStation Plus": "PlayStation Plus is often left active because it is attached to a gaming account and not always revisited after a break. This guide makes sure you stop the auto-renewal in the right account section and keep any remaining time you have already paid for.",
  "Xbox Game Pass": "Xbox Game Pass is easy to keep around while someone is in a gaming cycle, then forget to cancel when the habit changes. The important part is checking the platform account that owns the subscription so you do not get billed again.",
  "Audible": "Audible is commonly forgotten because the credit or membership is often used sporadically rather than every month. This guide helps you stop the renewal and decide whether you want to keep the remaining credit or let the membership end naturally.",
  "Readly": "Readly is easy to keep paying for when you are temporarily enjoying a reading trend, then forget about it once the habit fades. The main point is canceling in the right billing section before the next renew date.",
  "Duolingo Plus": "Duolingo Plus is an easy service to forget because it is often used sporadically and not tied to a bigger product bundle. This guide focuses on stopping the renewal in the app account so you do not keep paying for unused access.",
  "Viaplay": "Viaplay can feel like a package deal with live sports or entertainment, which makes it an easy subscription to keep past its usefulness. This page helps you cancel the active billing plan and avoid paying for the next month by mistake.",
  Adobe: "Adobe is often renewed with a plan that feels harder to control because it can be billed through multiple devices or account tiers. The best move is to cancel in the subscription settings and confirm the exact billing source before the next charge hits.",
};

export function CancelPageFaq({ productName }: { productName: string }) {
  const insight = productInsights[productName] ?? "This guide is designed to help you cancel the service cleanly, avoid surprise renewals, and keep the access you have already paid for until the end of the current billing cycle.";
  const faqs = getCancelGuideFaqs(productName);

  return (
    <section id="faq" className="rounded-[24px] border border-slate-200/80 bg-white/75 p-7 shadow-[0_15px_50px_-25px_rgba(15,23,42,0.28)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm leading-7 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
        <span className="font-semibold">Why this matters for {productName}:</span> {insight}
      </div>
      <div className="mt-5 space-y-6">
        {faqs.map((faq) => (
          <div key={faq.question}>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{faq.question}</h3>
            <p className="mt-3 text-base leading-8 text-slate-600 dark:text-slate-300">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CancelPageJsonLd({ productName, url, steps }: { productName: string; url: string; steps?: Array<{ title: string; description: string }> }) {
  const faqs = getCancelGuideFaqs(productName);

  // Structured data for FAQ
  const faqSchema = {
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
  };

  // Structured data for HowTo (cancellation steps)
  const howToSchema = steps ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to cancel ${productName}`,
    description: `Step-by-step guide to cancel ${productName} subscription`,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.description,
    })),
  } : null;

  // Structured data for Breadcrumb
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://subveris.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Cancel Subscriptions",
        item: "https://subveris.com/cancel",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `Cancel ${productName}`,
        item: url,
      },
    ],
  };

  // Organization schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Subveris",
    url: "https://subveris.com",
    logo: "https://subveris.com/assets/logo.png?v=3",
    description: PRODUCT_POSITIONING.description,
    sameAs: [
      "https://twitter.com/subveris",
      "https://www.linkedin.com/company/subveris",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      email: "support@subveris.com",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      {howToSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
    </>
  );
}
