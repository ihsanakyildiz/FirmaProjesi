import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";

export type PricingFeatureItem = {
  label: string;
  included: boolean;
};

export type PricingBillingInterval = "monthly" | "yearly";

export type PricingBillingOptions = {
  monthlyEnabled: boolean;
  yearlyEnabled: boolean;
  /** true when both intervals are on — show Aylık/Yıllık switch */
  showToggle: boolean;
  /** default interval when toggle is hidden or for initial state */
  defaultInterval: PricingBillingInterval;
};

export type PricingPlanView = {
  id: string;
  name: string;
  slug: string;
  blurb: string | null;
  detailContent: string | null;
  coverImage: string | null;
  priceMonthly: string;
  priceYearly: string;
  showPeriod: boolean;
  featured: boolean;
  features: PricingFeatureItem[];
  ctaLabel: string;
  ctaHref: string;
  purchasable: boolean;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
};

const MAX_FEATURES = 12;

function mapPlan(plan: {
  id: string;
  name: string;
  slug: string | null;
  blurb: string | null;
  detailContent: string | null;
  coverImage: string | null;
  priceMonthly: string;
  priceYearly: string;
  showPeriod: boolean;
  featured: boolean;
  features: string | null;
  ctaLabel: string;
  ctaHref: string;
  purchasable: boolean;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
}): PricingPlanView {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug || plan.id,
    blurb: plan.blurb,
    detailContent: plan.detailContent,
    coverImage: plan.coverImage,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    showPeriod: plan.showPeriod,
    featured: plan.featured,
    features: parsePricingFeatures(plan.features),
    ctaLabel: plan.ctaLabel,
    ctaHref: plan.ctaHref,
    purchasable: plan.purchasable,
    stripePriceIdMonthly: plan.stripePriceIdMonthly,
    stripePriceIdYearly: plan.stripePriceIdYearly,
  };
}

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

export function resolvePricingBillingOptions(
  settings: Record<string, string>,
): PricingBillingOptions {
  const monthlyEnabled = settings.pricing_billing_monthly_enabled !== "false";
  const yearlyEnabled = settings.pricing_billing_yearly_enabled !== "false";

  if (monthlyEnabled && yearlyEnabled) {
    return {
      monthlyEnabled: true,
      yearlyEnabled: true,
      showToggle: true,
      defaultInterval: "monthly",
    };
  }
  if (yearlyEnabled && !monthlyEnabled) {
    return {
      monthlyEnabled: false,
      yearlyEnabled: true,
      showToggle: false,
      defaultInterval: "yearly",
    };
  }
  return {
    monthlyEnabled: monthlyEnabled || !yearlyEnabled,
    yearlyEnabled: false,
    showToggle: false,
    defaultInterval: "monthly",
  };
}

export async function getPricingBillingOptions(): Promise<PricingBillingOptions> {
  const settings = await getSettingsMap().catch(
    () => ({}) as Record<string, string>,
  );
  return resolvePricingBillingOptions(settings);
}

export async function getActivePricingPlans(): Promise<PricingPlanView[]> {
  const plans = await prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return plans.map(mapPlan);
}

export async function getPricingPlanBySlug(
  slug: string,
): Promise<PricingPlanView | null> {
  const plan = await prisma.pricingPlan.findFirst({
    where: { slug, isActive: true },
  });
  return plan ? mapPlan(plan) : null;
}
