import { prisma } from "@/lib/prisma";

export type PricingFeatureItem = {
  label: string;
  included: boolean;
};

export type PricingPlanView = {
  id: string;
  name: string;
  blurb: string | null;
  priceMonthly: string;
  priceYearly: string;
  showPeriod: boolean;
  featured: boolean;
  features: PricingFeatureItem[];
  ctaLabel: string;
  ctaHref: string;
};

const MAX_FEATURES = 12;

export function parsePricingFeatures(
  raw: string | null | undefined,
): PricingFeatureItem[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const label = String(row.label ?? "").trim();
        if (!label) return null;
        return {
          label: label.slice(0, 200),
          included: row.included !== false && row.included !== "false",
        };
      })
      .filter((item): item is PricingFeatureItem => Boolean(item))
      .slice(0, MAX_FEATURES);
  } catch {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, MAX_FEATURES)
      .map((label) => ({ label, included: true }));
  }
}

export function serializePricingFeatures(
  features: PricingFeatureItem[],
): string | null {
  const cleaned = features
    .map((item) => ({
      label: item.label.trim().slice(0, 200),
      included: Boolean(item.included),
    }))
    .filter((item) => item.label)
    .slice(0, MAX_FEATURES);
  return cleaned.length ? JSON.stringify(cleaned) : null;
}

export async function getActivePricingPlans(): Promise<PricingPlanView[]> {
  const plans = await prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    blurb: plan.blurb,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    showPeriod: plan.showPeriod,
    featured: plan.featured,
    features: parsePricingFeatures(plan.features),
    ctaLabel: plan.ctaLabel,
    ctaHref: plan.ctaHref,
  }));
}
