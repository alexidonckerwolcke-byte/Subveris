import type { AIRecommendation } from "@shared/schema";
import { getSubscriptionUsageCount } from "./health-score";
import { calculateMonthlyCost, parseSubscriptionRenewalDate } from "./utils";

function normalizeText(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function getUsageValue(sub: any): number | null {
  const usage = getSubscriptionUsageCount(sub);
  return Number.isFinite(usage) ? usage : null;
}

function getRenewalText(sub: any): string {
  const nextBilling = sub.nextBillingDate || sub.next_billing_date || sub.next_billing_at || sub.next_billing;
  if (!nextBilling) return "";

  const date = parseSubscriptionRenewalDate(nextBilling);
  if (!date) return "";

  return ` Next payment is due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`;
}

function monthlyAmountFor(sub: any): number {
  return calculateMonthlyCost(Number(sub.amount) || 0, normalizeText(sub.frequency) || "monthly");
}

function createRecommendation(rec: AIRecommendation): AIRecommendation {
  return {
    ...rec,
    title: rec.title.trim(),
    description: rec.description.trim(),
    confidence: Math.min(Math.max(rec.confidence, 0), 1),
  };
}

export function generateRecommendationsFromSubscriptions(subs: any[] | undefined): AIRecommendation[] {
  if (!subs || subs.length === 0) return [];

  // Only generate recommendations for subscriptions that are unused or
  // already flagged to cancel. We do not surface recommendations for
  // active subscriptions here per product requirement.
  const cleaned = subs.filter(Boolean).filter((sub) => sub.status !== "deleted");
  if (cleaned.length === 0) return [];

  const targetSubs = cleaned.filter(
    (sub) => normalizeText(sub.status) === "unused" || normalizeText(sub.status) === "to-cancel"
  );
  if (targetSubs.length === 0) return [];

  const recommendations: AIRecommendation[] = [];

  for (const sub of targetSubs) {
    const monthlyCost = monthlyAmountFor(sub);
    const usage = getUsageValue(sub);
    const nextBillingText = getRenewalText(sub);
    const name = String(sub.name || "Unknown service");
    const currency = sub.currency || "USD";
    const subId = sub.id || `sub-${Math.random().toString(36).slice(2)}`;

    if (normalizeText(sub.status) === "to-cancel") {
      const titleOptions = [
        `Finalize cancellation for ${name}`,
        `Complete the cancellation for ${name}`,
        `Stop ${name} before the next renewal`,
      ];
      const title = titleOptions[name.length % titleOptions.length];
      const description = `${name} is already marked to stop. Finish the cancellation process${nextBillingText ? ` before the next payment (${nextBillingText.trim()})` : ""} to avoid another charge.`;

      recommendations.push(
        createRecommendation({
          id: `rec-${subId}-complete-cancel`,
          type: "cancel",
          title,
          description,
          currentCost: monthlyCost,
          suggestedCost: 0,
          savings: monthlyCost,
          subscriptionId: subId,
          confidence: 0.98,
          currency,
        })
      );
      continue;
    }

    if (normalizeText(sub.status) === "unused") {
      const usageMessage =
        usage === null
          ? "There has been little to no activity."
          : usage === 0
          ? "There has been no activity this month."
          : usage === 1
          ? "It was used only once this month."
          : `It was used only ${usage} times this month.`;

      const title =
        usage === null || usage === 0
          ? `Cancel ${name}`
          : usage === 1
            ? `Review ${name}`
            : `Reduce ${name} spend`;

      const detail =
        usage === null || usage === 0
          ? `${name} still has recurring cost with no recent activity.`
          : usage === 1
            ? `${name} still has recurring cost for just one use this month.`
            : `${name} still has recurring cost for only ${usage} uses this month.`;

      recommendations.push(
        createRecommendation({
          id: `rec-${subId}-cancel-unused`,
          type: "cancel",
          title,
          description: `${usageMessage} ${detail} Cancel it before the next renewal to keep your subscription spend lean.${nextBillingText}`,
          currentCost: monthlyCost,
          suggestedCost: 0,
          savings: monthlyCost,
          subscriptionId: subId,
          confidence: 0.99,
          currency,
        })
      );
      continue;
    }
  }

  return recommendations.sort((a, b) => b.confidence - a.confidence);
}
