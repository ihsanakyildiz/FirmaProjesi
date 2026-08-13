"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  serializePricingFeatures,
  type PricingFeatureItem,
} from "@/lib/pricing";

export type PricingFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeletePricingResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session;
}

function parseFeaturesFromForm(formData: FormData): PricingFeatureItem[] {
  const labels = formData
    .getAll("featureLabel[]")
    .map((item) => String(item ?? "").trim());
  const includedFlags = formData.getAll("featureIncluded[]").map((item) => {
    const value = String(item ?? "");
    return value === "on" || value === "true" || value === "1";
  });

  const features: PricingFeatureItem[] = [];
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i];
    if (!label) continue;
    features.push({
      label,
      included: includedFlags[i] === true,
    });
  }
  return features.slice(0, 12);
}

function parsePricingPayload(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const blurb = String(formData.get("blurb") ?? "").trim();
  const priceMonthly = String(formData.get("priceMonthly") ?? "").trim();
  const priceYearly = String(formData.get("priceYearly") ?? "").trim();
  const showPeriod =
    formData.get("showPeriod") === "on" ||
    formData.get("showPeriod") === "true";
  const featured =
    formData.get("featured") === "on" || formData.get("featured") === "true";
  const ctaLabel = String(formData.get("ctaLabel") ?? "").trim() || "Başlayın";
  const ctaHref =
    String(formData.get("ctaHref") ?? "").trim() || "/iletisim";
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const features = parseFeaturesFromForm(formData);

  return {
    name,
    blurb,
    priceMonthly,
    priceYearly,
    showPeriod,
    featured,
    ctaLabel,
    ctaHref,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    features,
  };
}

function revalidatePricing() {
  revalidatePath("/admin/pricing");
  revalidatePath("/");
}

export async function createPricingPlanAction(
  _prev: PricingFormState,
  formData: FormData,
): Promise<PricingFormState> {
  try {
    await requireAdmin();
    const data = parsePricingPayload(formData);

    if (!data.name) {
      return {
        error: "Paket adı zorunludur.",
        fieldErrors: { name: "Zorunlu alan" },
      };
    }
    if (!data.priceMonthly) {
      return {
        error: "Aylık fiyat zorunludur.",
        fieldErrors: { priceMonthly: "Zorunlu alan" },
      };
    }
    if (!data.priceYearly) {
      return {
        error: "Yıllık fiyat zorunludur.",
        fieldErrors: { priceYearly: "Zorunlu alan" },
      };
    }

    let sortOrder = data.sortOrder;
    if (!String(formData.get("sortOrder") ?? "").trim()) {
      const last = await prisma.pricingPlan.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const plan = await prisma.pricingPlan.create({
      data: {
        name: data.name,
        blurb: data.blurb || null,
        priceMonthly: data.priceMonthly,
        priceYearly: data.priceYearly,
        showPeriod: data.showPeriod,
        featured: data.featured,
        features: serializePricingFeatures(data.features),
        ctaLabel: data.ctaLabel,
        ctaHref: data.ctaHref,
        isActive: data.isActive,
        sortOrder,
      },
    });

    revalidatePricing();
    revalidatePath(`/admin/pricing/${plan.id}/edit`);
    return { success: true, message: "Paket oluşturuldu." };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { error: "Oturum bulunamadı." };
    }
    console.error(error);
    return { error: "Paket oluşturulurken hata oluştu." };
  }
}

export async function updatePricingPlanAction(
  id: string,
  _prev: PricingFormState,
  formData: FormData,
): Promise<PricingFormState> {
  try {
    await requireAdmin();
    const existing = await prisma.pricingPlan.findUnique({ where: { id } });
    if (!existing) return { error: "Paket bulunamadı." };

    const data = parsePricingPayload(formData);

    if (!data.name) {
      return {
        error: "Paket adı zorunludur.",
        fieldErrors: { name: "Zorunlu alan" },
      };
    }
    if (!data.priceMonthly) {
      return {
        error: "Aylık fiyat zorunludur.",
        fieldErrors: { priceMonthly: "Zorunlu alan" },
      };
    }
    if (!data.priceYearly) {
      return {
        error: "Yıllık fiyat zorunludur.",
        fieldErrors: { priceYearly: "Zorunlu alan" },
      };
    }

    await prisma.pricingPlan.update({
      where: { id },
      data: {
        name: data.name,
        blurb: data.blurb || null,
        priceMonthly: data.priceMonthly,
        priceYearly: data.priceYearly,
        showPeriod: data.showPeriod,
        featured: data.featured,
        features: serializePricingFeatures(data.features),
        ctaLabel: data.ctaLabel,
        ctaHref: data.ctaHref,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    revalidatePricing();
    revalidatePath(`/admin/pricing/${id}/edit`);
    return { success: true, message: "Paket güncellendi." };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { error: "Oturum bulunamadı." };
    }
    console.error(error);
    return { error: "Paket güncellenirken hata oluştu." };
  }
}

export async function deletePricingPlanAction(
  id: string,
): Promise<DeletePricingResult> {
  try {
    await requireAdmin();
    const existing = await prisma.pricingPlan.findUnique({ where: { id } });
    if (!existing) return { error: "Paket bulunamadı." };

    await prisma.pricingPlan.delete({ where: { id } });
    revalidatePricing();
    return { success: true, message: "Paket silindi." };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { error: "Oturum bulunamadı." };
    }
    console.error(error);
    return { error: "Paket silinirken hata oluştu." };
  }
}

export async function togglePricingPlanActiveAction(
  id: string,
): Promise<DeletePricingResult> {
  try {
    await requireAdmin();
    const existing = await prisma.pricingPlan.findUnique({ where: { id } });
    if (!existing) return { error: "Paket bulunamadı." };

    await prisma.pricingPlan.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    revalidatePricing();
    return {
      success: true,
      message: existing.isActive ? "Paket pasifleştirildi." : "Paket aktifleştirildi.",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { error: "Oturum bulunamadı." };
    }
    console.error(error);
    return { error: "Durum güncellenirken hata oluştu." };
  }
}
