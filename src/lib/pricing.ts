import { ensurePricingPlansTable } from "@/lib/ensure-pricing-schema";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";

export type PricingFeatureItem = {
  label: string;
  included: boolean;
};

export type PricingBillingInterval = "monthly" | "yearly";

/** project = tek seferlik proje bedeli; subscription = aylık/yıllık abonelik */
export type PricingDisplayMode = "project" | "subscription";

export type PricingBillingOptions = {
  mode: PricingDisplayMode;
  monthlyEnabled: boolean;
  yearlyEnabled: boolean;
  /** true when both intervals are on — show Aylık/Yıllık switch */
  showToggle: boolean;
  /** default interval when toggle is hidden or for initial state */
  defaultInterval: PricingBillingInterval;
};

export const PROJECT_PRICE_PERIOD_LABEL = "tek seferlik";

export type PricingPlanView = {
  id: string;
  name: string;
  slug: string;
  blurb: string | null;
  detailContent: string | null;
  coverImage: string | null;
  priceMonthly: string;
  priceYearly: string;
  priceMonthlyDiscount: string | null;
  priceYearlyDiscount: string | null;
  showPeriod: boolean;
  featured: boolean;
  features: PricingFeatureItem[];
  ctaLabel: string;
  ctaHref: string;
  purchasable: boolean;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
};

export type ResolvedPlanPrice = {
  /** Gösterilecek asıl fiyat (indirimli varsa o) */
  price: string;
  /** Üstü çizili liste fiyatı; indirim yoksa null */
  compareAt: string | null;
  discounted: boolean;
};

export function resolvePlanPrice(
  plan: Pick<
    PricingPlanView,
    | "priceMonthly"
    | "priceYearly"
    | "priceMonthlyDiscount"
    | "priceYearlyDiscount"
  >,
  interval: PricingBillingInterval,
  mode: PricingDisplayMode = "subscription",
): ResolvedPlanPrice {
  const list =
    mode === "project"
      ? plan.priceMonthly
      : interval === "monthly"
        ? plan.priceMonthly
        : plan.priceYearly;
  const saleRaw =
    mode === "project"
      ? plan.priceMonthlyDiscount
      : interval === "monthly"
        ? plan.priceMonthlyDiscount
        : plan.priceYearlyDiscount;
  const sale = saleRaw?.trim() || null;
  if (sale && sale !== list) {
    return { price: sale, compareAt: list, discounted: true };
  }
  return { price: list, compareAt: null, discounted: false };
}

export function getPricingPeriodLabel(
  billingOptions: Pick<PricingBillingOptions, "mode" | "defaultInterval">,
): string {
  if (billingOptions.mode === "project") {
    return PROJECT_PRICE_PERIOD_LABEL;
  }
  return billingOptions.defaultInterval === "monthly" ? "ay" : "yıl";
}

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
  priceMonthlyDiscount?: string | null;
  priceYearlyDiscount?: string | null;
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
    priceMonthlyDiscount: plan.priceMonthlyDiscount?.trim() || null,
    priceYearlyDiscount: plan.priceYearlyDiscount?.trim() || null,
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
  const monthlyEnabled = settings.pricing_billing_monthly_enabled === "true";
  const yearlyEnabled = settings.pricing_billing_yearly_enabled === "true";

  if (!monthlyEnabled && !yearlyEnabled) {
    return {
      mode: "project",
      monthlyEnabled: false,
      yearlyEnabled: false,
      showToggle: false,
      defaultInterval: "monthly",
    };
  }

  if (monthlyEnabled && yearlyEnabled) {
    return {
      mode: "subscription",
      monthlyEnabled: true,
      yearlyEnabled: true,
      showToggle: true,
      defaultInterval: "monthly",
    };
  }
  if (yearlyEnabled && !monthlyEnabled) {
    return {
      mode: "subscription",
      monthlyEnabled: false,
      yearlyEnabled: true,
      showToggle: false,
      defaultInterval: "yearly",
    };
  }
  return {
    mode: "subscription",
    monthlyEnabled: true,
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
  await ensurePricingPlansTable();
  const plans = await prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return plans.map(mapPlan);
}

export async function getPricingPlanBySlug(
  slug: string,
): Promise<PricingPlanView | null> {
  await ensurePricingPlansTable();
  const plan = await prisma.pricingPlan.findFirst({
    where: { slug, isActive: true },
  });
  return plan ? mapPlan(plan) : null;
}
