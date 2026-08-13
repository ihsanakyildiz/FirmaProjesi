"use server";

import { revalidatePath } from "next/cache";
import type { CardMediaType } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type CardFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteCardResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session;
}

function parseMediaType(raw: string): CardMediaType {
  return raw === "IMAGE" ? "IMAGE" : "ICON";
}

function parseCardPayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();
  const mediaType = parseMediaType(String(formData.get("mediaType") ?? "ICON"));
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const existingImage = String(formData.get("image") ?? "").trim();
  const imageFile = formData.get("image_file");

  return {
    title,
    href,
    icon,
    mediaType,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    existingImage,
    imageFile,
  };
}

export async function createCardAction(
  _prev: CardFormState,
  formData: FormData,
): Promise<CardFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parseCardPayload(formData);
  const fieldErrors: Record<string, string> = {};

  if (!data.title) fieldErrors.title = "Kart başlığı zorunludur.";
  if (!data.href) fieldErrors.href = "Sayfa linki zorunludur.";
  if (data.mediaType === "ICON" && !data.icon) {
    fieldErrors.icon = "İkon seçin veya görsel tipine geçin.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Lütfen formu kontrol edin.", fieldErrors };
  }

  try {
    let image: string | null = null;

    if (data.mediaType === "IMAGE") {
      if (data.imageFile instanceof File && data.imageFile.size > 0) {
        const saved = await saveOptimizedImage(data.imageFile, {
          uploadDir: "uploads/cards",
          maxBytes: uploadLimits.image,
          mode: "webp",
          quality: 82,
        });
        image = saved.publicPath;
      } else if (data.existingImage) {
        image = data.existingImage;
      } else {
        return {
          error: "Görsel tipi için bir görsel yükleyin.",
          fieldErrors: { image: "Görsel zorunlu" },
        };
      }
    }

    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.card.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    await prisma.card.create({
      data: {
        title: data.title,
        href: data.href,
        mediaType: data.mediaType,
        icon: data.mediaType === "ICON" ? data.icon : null,
        image: data.mediaType === "IMAGE" ? image : null,
        sortOrder,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/cards");
    return { success: true, message: "Kart oluşturuldu." };
  } catch (error) {
    console.error(error);
    return { error: "Kart eklenirken bir hata oluştu." };
  }
}

export async function updateCardAction(
  _prev: CardFormState,
  formData: FormData,
): Promise<CardFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Kart bulunamadı." };

  const data = parseCardPayload(formData);
  const fieldErrors: Record<string, string> = {};

  if (!data.title) fieldErrors.title = "Kart başlığı zorunludur.";
  if (!data.href) fieldErrors.href = "Sayfa linki zorunludur.";
  if (data.mediaType === "ICON" && !data.icon) {
    fieldErrors.icon = "İkon seçin veya görsel tipine geçin.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Lütfen formu kontrol edin.", fieldErrors };
  }

  try {
    const existing = await prisma.card.findUnique({ where: { id } });
    if (!existing) return { error: "Kart bulunamadı." };

    let image = data.existingImage;

    if (data.mediaType === "IMAGE") {
      if (data.imageFile instanceof File && data.imageFile.size > 0) {
        const saved = await saveOptimizedImage(data.imageFile, {
          uploadDir: "uploads/cards",
          maxBytes: uploadLimits.image,
          mode: "webp",
          quality: 82,
          previousPath: existing.image || undefined,
        });
        image = saved.publicPath;
      } else if (!image) {
        return {
          error: "Görsel tipi için bir görsel yükleyin.",
          fieldErrors: { image: "Görsel zorunlu" },
        };
      }
    } else if (existing.image) {
      await deletePublicAsset(existing.image);
      image = "";
    }

    await prisma.card.update({
      where: { id },
      data: {
        title: data.title,
        href: data.href,
        mediaType: data.mediaType,
        icon: data.mediaType === "ICON" ? data.icon : null,
        image: data.mediaType === "IMAGE" ? image || null : null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });

    revalidatePath("/admin/cards");
    revalidatePath(`/admin/cards/${id}/edit`);
    return { success: true, message: "Kart güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Kart güncellenirken bir hata oluştu." };
  }
}

export async function deleteCardAction(formData: FormData): Promise<DeleteCardResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Kart bulunamadı." };

  const existing = await prisma.card.findUnique({ where: { id } });
  if (!existing) return { error: "Kart bulunamadı." };

  await prisma.card.delete({ where: { id } });
  if (existing.image) {
    await deletePublicAsset(existing.image);
  }

  revalidatePath("/admin/cards");
  return { success: true, message: "Kart silindi." };
}

export async function toggleCardActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.card.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.card.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidatePath("/admin/cards");
}
