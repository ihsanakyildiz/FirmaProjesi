"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  serializePricingFeatures,
  type PricingFeatureItem,
} from "@/lib/pricing";
import {
  collectEditorUploadPathsFromHtmlList,
  diffRemovedEditorUploadPaths,
  purgeUnreferencedEditorUploads,
} from "@/lib/rich-text-uploads";
import { slugify } from "@/lib/slug";
import { publicPricingPlanHref } from "@/lib/public-urls";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

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
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

async function uniquePricingSlug(base: string, excludeId?: string) {
  const slug = slugify(base) || "paket";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.pricingPlan.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${slug}-${i}`;
    i += 1;
  }
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
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const blurb = String(formData.get("blurb") ?? "").trim();
  const detailContent = String(formData.get("detailContent") ?? "").trim();
  const existingCoverImage = String(formData.get("coverImage") ?? "").trim();
  const coverImageFile = formData.get("coverImage_file");
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
  const purchasable =
    formData.get("purchasable") === "on" || formData.get("purchasable") === "true";
  const stripePriceIdMonthly = String(formData.get("stripePriceIdMonthly") ?? "").trim();
  const stripePriceIdYearly = String(formData.get("stripePriceIdYearly") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const features = parseFeaturesFromForm(formData);

  return {
    name,
    slugRaw,
    blurb,
    detailContent,
    existingCoverImage,
    coverImageFile:
      coverImageFile instanceof File && coverImageFile.size > 0
        ? coverImageFile
        : null,
    priceMonthly,
    priceYearly,
    showPeriod,
    featured,
    ctaLabel,
    ctaHref,
    purchasable,
    stripePriceIdMonthly: stripePriceIdMonthly || null,
    stripePriceIdYearly: stripePriceIdYearly || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    features,
  };
}

async function resolveCoverImage(
  existingCoverImage: string,
  coverImageFile: File | null,
  previousPath?: string | null,
): Promise<string | null> {
  if (coverImageFile) {
    const saved = await saveOptimizedImage(coverImageFile, {
      uploadDir: "uploads/pricing",
      maxBytes: uploadLimits.image,
      mode: "webp",
      quality: 82,
      width: 1920,
      height: 1080,
      fit: "cover",
      previousPath: previousPath || undefined,
    });
    return saved.publicPath;
  }

  // Kapak kaldırıldıysa eski dosyayı public/FTP’den sil
  if (!existingCoverImage && previousPath) {
    await deletePublicAsset(previousPath);
    return null;
  }

  return existingCoverImage || null;
}

function revalidatePricing(slug?: string | null) {
  revalidatePath("/admin/pricing");
  revalidatePath("/");
  if (slug) revalidatePath(publicPricingPlanHref(slug));
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

    const slug = await uniquePricingSlug(data.slugRaw || data.name);
    const coverImage = await resolveCoverImage(
      data.existingCoverImage,
      data.coverImageFile,
    );

    const plan = await prisma.pricingPlan.create({
      data: {
        name: data.name,
        slug,
        blurb: data.blurb || null,
        detailContent: data.detailContent || null,
        coverImage,
        priceMonthly: data.priceMonthly,
        priceYearly: data.priceYearly,
        showPeriod: data.showPeriod,
        featured: data.featured,
        features: serializePricingFeatures(data.features),
        ctaLabel: data.ctaLabel,
        ctaHref: data.ctaHref,
        purchasable: data.purchasable,
        stripePriceIdMonthly: data.stripePriceIdMonthly,
        stripePriceIdYearly: data.stripePriceIdYearly,
        isActive: data.isActive,
        sortOrder,
      },
    });

    revalidatePricing(plan.slug);
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

    const slug = await uniquePricingSlug(
      data.slugRaw || data.name,
      id,
    );
    const coverImage = await resolveCoverImage(
      data.existingCoverImage,
      data.coverImageFile,
      existing.coverImage,
    );

    const removedEditorPaths = diffRemovedEditorUploadPaths(
      existing.detailContent,
      data.detailContent || null,
    );

    await prisma.pricingPlan.update({
      where: { id },
      data: {
        name: data.name,
        slug,
        blurb: data.blurb || null,
        detailContent: data.detailContent || null,
        coverImage,
        priceMonthly: data.priceMonthly,
        priceYearly: data.priceYearly,
        showPeriod: data.showPeriod,
        featured: data.featured,
        features: serializePricingFeatures(data.features),
        ctaLabel: data.ctaLabel,
        ctaHref: data.ctaHref,
        purchasable: data.purchasable,
        stripePriceIdMonthly: data.stripePriceIdMonthly,
        stripePriceIdYearly: data.stripePriceIdYearly,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    if (removedEditorPaths.length > 0) {
      await purgeUnreferencedEditorUploads(removedEditorPaths, {
        excludePricingPlanIds: [id],
      });
    }

    revalidatePricing(existing.slug);
    revalidatePricing(slug);
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

    const editorPaths = collectEditorUploadPathsFromHtmlList([
      existing.detailContent,
    ]);
    const coverPath = existing.coverImage;

    await prisma.pricingPlan.delete({ where: { id } });

    if (coverPath) {
      await deletePublicAsset(coverPath);
    }
    if (editorPaths.length > 0) {
      await purgeUnreferencedEditorUploads(editorPaths);
    }

    revalidatePricing(existing.slug);
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
    revalidatePricing(existing.slug);
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

export async function updatePricingBillingSettingsAction(
  _prev: PricingFormState,
  formData: FormData,
): Promise<PricingFormState> {
  try {
    await requireAdmin();
    const monthlyEnabled =
      formData.get("pricing_billing_monthly_enabled") === "on" ||
      formData.get("pricing_billing_monthly_enabled") === "true";
    const yearlyEnabled =
      formData.get("pricing_billing_yearly_enabled") === "on" ||
      formData.get("pricing_billing_yearly_enabled") === "true";

    if (!monthlyEnabled && !yearlyEnabled) {
      return {
        error: "Aylık veya yıllık fiyatlandırmadan en az biri açık olmalıdır.",
      };
    }

    await prisma.setting.upsert({
      where: { key: "pricing_billing_monthly_enabled" },
      update: { value: monthlyEnabled ? "true" : "false" },
      create: {
        key: "pricing_billing_monthly_enabled",
        value: monthlyEnabled ? "true" : "false",
        label: "Aylık fiyatlandırma",
        type: "boolean",
        group: "pricing_billing",
        sortOrder: 0,
      },
    });
    await prisma.setting.upsert({
      where: { key: "pricing_billing_yearly_enabled" },
      update: { value: yearlyEnabled ? "true" : "false" },
      create: {
        key: "pricing_billing_yearly_enabled",
        value: yearlyEnabled ? "true" : "false",
        label: "Yıllık fiyatlandırma",
        type: "boolean",
        group: "pricing_billing",
        sortOrder: 1,
      },
    });

    revalidateTag("settings");
    revalidatePricing();
    return { success: true, message: "Dönem ayarları kaydedildi." };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { error: "Oturum bulunamadı." };
    }
    console.error(error);
    return { error: "Ayarlar kaydedilirken hata oluştu." };
  }
}
