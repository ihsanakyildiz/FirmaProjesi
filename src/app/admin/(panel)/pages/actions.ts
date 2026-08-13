"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolvePageSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type PageFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeletePageResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

async function uniquePageSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || "sayfa";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.page.findFirst({
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

async function resolveRelatedIds(
  model: "work" | "project" | "blogPost",
  rawIds: string[],
) {
  const unique = [...new Set(rawIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [] as string[];

  switch (model) {
    case "work": {
      const found = await prisma.work.findMany({
        where: { id: { in: unique } },
        select: { id: true },
      });
      if (found.length !== unique.length) throw new Error("WORK_NOT_FOUND");
      return found.map((item) => item.id);
    }
    case "project": {
      const found = await prisma.project.findMany({
        where: { id: { in: unique } },
        select: { id: true },
      });
      if (found.length !== unique.length) throw new Error("PROJECT_NOT_FOUND");
      return found.map((item) => item.id);
    }
    case "blogPost": {
      const found = await prisma.blogPost.findMany({
        where: { id: { in: unique } },
        select: { id: true },
      });
      if (found.length !== unique.length) throw new Error("POST_NOT_FOUND");
      return found.map((item) => item.id);
    }
    default: {
      const _exhaustive: never = model;
      return _exhaustive;
    }
  }
}

function parsePagePayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const existingImage = String(formData.get("image") ?? "").trim();
  const imageFile = formData.get("image_file");
  const workIds = formData
    .getAll("workIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const projectIds = formData
    .getAll("projectIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const postIds = formData
    .getAll("postIds")
    .map((value) => String(value).trim())
    .filter(Boolean);

  return {
    title,
    slugInput,
    summary,
    content,
    seoTitle,
    seoDescription,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    existingImage,
    imageFile,
    workIds,
    projectIds,
    postIds,
  };
}

function mapRelationError(error: unknown): PageFormState | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "WORK_NOT_FOUND") {
    return { error: "Seçilen çalışmalardan biri bulunamadı." };
  }
  if (error.message === "PROJECT_NOT_FOUND") {
    return { error: "Seçilen projelerden biri bulunamadı." };
  }
  if (error.message === "POST_NOT_FOUND") {
    return { error: "Seçilen yazılardan biri bulunamadı." };
  }
  return null;
}

export async function createClassicPageAction(
  _prev: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parsePagePayload(formData);
  if (!data.title) {
    return { error: "Başlık zorunludur.", fieldErrors: { title: "Zorunlu alan" } };
  }
  if (data.seoTitle.length > SEO_TITLE_MAX) {
    return {
      error: `SEO başlığı en fazla ${SEO_TITLE_MAX} karakter olabilir.`,
      fieldErrors: { seoTitle: `En fazla ${SEO_TITLE_MAX} karakter` },
    };
  }
  if (data.seoDescription.length > SEO_DESCRIPTION_MAX) {
    return {
      error: `SEO açıklaması en fazla ${SEO_DESCRIPTION_MAX} karakter olabilir.`,
      fieldErrors: { seoDescription: `En fazla ${SEO_DESCRIPTION_MAX} karakter` },
    };
  }

  try {
    const [workIds, projectIds, postIds] = await Promise.all([
      resolveRelatedIds("work", data.workIds),
      resolveRelatedIds("project", data.projectIds),
      resolveRelatedIds("blogPost", data.postIds),
    ]);
    const slug = await uniquePageSlug(data.slugInput || data.title);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/pages",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
      });
      image = saved.publicPath;
    }

    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.page.findFirst({
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const seo = resolvePageSeo({
      title: data.title,
      summary: data.summary,
      content: data.content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    await prisma.page.create({
      data: {
        type: "CLASSIC",
        title: data.title,
        slug,
        summary: data.summary || null,
        content: data.content || null,
        image: image || null,
        sortOrder,
        isActive: data.isActive,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        works: { connect: workIds.map((id) => ({ id })) },
        projects: { connect: projectIds.map((id) => ({ id })) },
        posts: { connect: postIds.map((id) => ({ id })) },
      },
    });

    revalidatePath("/admin/pages");
    return { success: true, message: "Sayfa oluşturuldu." };
  } catch (error) {
    const mapped = mapRelationError(error);
    if (mapped) return mapped;
    console.error(error);
    return { error: "Sayfa eklenirken bir hata oluştu." };
  }
}

export async function updateClassicPageAction(
  _prev: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Sayfa bulunamadı." };

  const data = parsePagePayload(formData);
  if (!data.title) {
    return { error: "Başlık zorunludur.", fieldErrors: { title: "Zorunlu alan" } };
  }
  if (data.seoTitle.length > SEO_TITLE_MAX) {
    return {
      error: `SEO başlığı en fazla ${SEO_TITLE_MAX} karakter olabilir.`,
      fieldErrors: { seoTitle: `En fazla ${SEO_TITLE_MAX} karakter` },
    };
  }
  if (data.seoDescription.length > SEO_DESCRIPTION_MAX) {
    return {
      error: `SEO açıklaması en fazla ${SEO_DESCRIPTION_MAX} karakter olabilir.`,
      fieldErrors: { seoDescription: `En fazla ${SEO_DESCRIPTION_MAX} karakter` },
    };
  }

  try {
    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) return { error: "Sayfa bulunamadı." };
    if (existing.type !== "CLASSIC") {
      return { error: "Bu sayfa gelişmiş tipte; klasik form ile düzenlenemez." };
    }

    const [workIds, projectIds, postIds] = await Promise.all([
      resolveRelatedIds("work", data.workIds),
      resolveRelatedIds("project", data.projectIds),
      resolveRelatedIds("blogPost", data.postIds),
    ]);
    const slug = await uniquePageSlug(data.slugInput || data.title, id);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/pages",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
        previousPath: existing.image || undefined,
      });
      image = saved.publicPath;
    } else if (!image && existing.image) {
      await deletePublicAsset(existing.image);
      image = "";
    }

    const seo = resolvePageSeo({
      title: data.title,
      summary: data.summary,
      content: data.content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    await prisma.page.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        summary: data.summary || null,
        content: data.content || null,
        image: image || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        works: { set: workIds.map((workId) => ({ id: workId })) },
        projects: { set: projectIds.map((projectId) => ({ id: projectId })) },
        posts: { set: postIds.map((postId) => ({ id: postId })) },
      },
    });

    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${id}/edit`);
    return { success: true, message: "Sayfa güncellendi." };
  } catch (error) {
    const mapped = mapRelationError(error);
    if (mapped) return mapped;
    console.error(error);
    return { error: "Sayfa güncellenirken bir hata oluştu." };
  }
}

export async function deletePageAction(formData: FormData): Promise<DeletePageResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Sayfa bulunamadı." };

  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return { error: "Sayfa bulunamadı." };

  const imagePath = existing.image;
  await prisma.page.delete({ where: { id } });
  if (imagePath) {
    await deletePublicAsset(imagePath);
  }

  revalidatePath("/admin/pages");
  return { success: true, message: "Sayfa silindi." };
}

export async function togglePageActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.page.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidatePath("/admin/pages");
}
