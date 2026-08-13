"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeProjectUrl,
  parseGalleryOrderJson,
  parseProjectMetricsJson,
  PROJECT_GALLERY_MAX,
} from "@/lib/project-portfolio";
import { resolveProjectSeo, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import {
  deletePublicAsset,
  saveOptimizedImage,
  uploadLimits,
} from "@/lib/uploads";

export type ProjectFormState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type DeleteProjectResult = {
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

async function uniqueProjectSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || "proje";
  let candidate = slug;
  let i = 2;

  while (true) {
    const existing = await prisma.project.findFirst({
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

async function assertValidProjectCategory(categoryId: string | null) {
  if (!categoryId) return null;

  const category = await prisma.projectCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new Error("CATEGORY_NOT_FOUND");
  }

  return categoryId;
}

async function resolveFeatureIds(rawIds: string[]) {
  const unique = [...new Set(rawIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [] as string[];

  const found = await prisma.projectFeature.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });

  if (found.length !== unique.length) {
    throw new Error("FEATURE_NOT_FOUND");
  }

  return found.map((feature) => feature.id);
}

async function assertValidProjectClient(clientId: string | null) {
  if (!clientId) return null;

  const client = await prisma.projectClient.findUnique({
    where: { id: clientId },
    select: { id: true },
  });
  if (!client) {
    throw new Error("CLIENT_NOT_FOUND");
  }

  return clientId;
}

function parseYear(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const year = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(year) || year < 1990 || year > 2100) return null;
  return year;
}

function parseProjectPayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();
  const categoryIdRaw = String(formData.get("categoryId") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive = formData.get("isActive") === "on" || formData.get("isActive") === "true";
  const isFeatured =
    formData.get("isFeatured") === "on" || formData.get("isFeatured") === "true";
  const hideProjectUrl =
    formData.get("hideProjectUrl") === "on" || formData.get("hideProjectUrl") === "true";
  const existingImage = String(formData.get("image") ?? "").trim();
  const imageFile = formData.get("image_file");
  const featureIds = formData
    .getAll("featureIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const projectUrl = normalizeProjectUrl(String(formData.get("projectUrl") ?? ""));
  const clientIdRaw = String(formData.get("clientId") ?? "").trim();
  const projectRole = String(formData.get("projectRole") ?? "").trim().slice(0, 191);
  const projectDuration = String(formData.get("projectDuration") ?? "").trim().slice(0, 100);
  const projectYear = parseYear(String(formData.get("projectYear") ?? ""));
  const metrics = parseProjectMetricsJson(String(formData.get("metrics_json") ?? "[]"));
  const galleryOrder = parseGalleryOrderJson(String(formData.get("gallery_order") ?? "[]"));
  const galleryFiles = formData
    .getAll("gallery_files")
    .filter((item): item is File => item instanceof File && item.size > 0);

  return {
    title,
    slugInput,
    summary,
    content,
    seoTitle,
    seoDescription,
    categoryId: categoryIdRaw || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    isFeatured,
    hideProjectUrl,
    existingImage,
    imageFile,
    featureIds,
    projectUrl,
    clientId: clientIdRaw || null,
    projectRole,
    projectDuration,
    projectYear,
    metrics,
    galleryOrder,
    galleryFiles,
  };
}

async function syncProjectGallery(
  projectId: string,
  order: ReturnType<typeof parseGalleryOrderJson>,
  files: File[],
) {
  const existing = await prisma.projectGalleryImage.findMany({
    where: { projectId },
  });
  const existingById = new Map(existing.map((item) => [item.id, item]));
  const keepIds = new Set(
    order.filter((item) => item.type === "existing").map((item) => item.id),
  );

  for (const item of existing) {
    if (!keepIds.has(item.id)) {
      await prisma.projectGalleryImage.delete({ where: { id: item.id } });
      await deletePublicAsset(item.image);
    }
  }

  let sortOrder = 0;
  for (const step of order.slice(0, PROJECT_GALLERY_MAX)) {
    if (step.type === "existing") {
      if (!existingById.has(step.id)) continue;
      await prisma.projectGalleryImage.update({
        where: { id: step.id },
        data: { sortOrder },
      });
      sortOrder += 1;
      continue;
    }

    const file = files[step.index];
    if (!(file instanceof File) || file.size === 0) continue;
    if (sortOrder >= PROJECT_GALLERY_MAX) break;

    const saved = await saveOptimizedImage(file, {
      uploadDir: "uploads/projects/gallery",
      maxBytes: uploadLimits.image,
      mode: "webp",
      quality: 82,
    });
    await prisma.projectGalleryImage.create({
      data: {
        projectId,
        image: saved.publicPath,
        sortOrder,
      },
    });
    sortOrder += 1;
  }
}

async function syncProjectMetrics(
  projectId: string,
  metrics: ReturnType<typeof parseProjectMetricsJson>,
) {
  await prisma.projectMetric.deleteMany({ where: { projectId } });
  if (metrics.length === 0) return;

  await prisma.projectMetric.createMany({
    data: metrics.map((metric, index) => ({
      projectId,
      label: metric.label,
      value: metric.value,
      sortOrder: index,
    })),
  });
}

function revalidateProjectPaths(id?: string) {
  revalidatePath("/admin/projects");
  revalidatePath("/admin/projects/categories");
  revalidatePath("/admin/projects/features");
  if (id) revalidatePath(`/admin/projects/${id}/edit`);
}

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parseProjectPayload(formData);
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
    const categoryId = await assertValidProjectCategory(data.categoryId);
    const clientId = await assertValidProjectClient(data.clientId);
    const featureIds = await resolveFeatureIds(data.featureIds);
    const slug = await uniqueProjectSlug(data.slugInput || data.title);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/projects",
        maxBytes: uploadLimits.image,
        mode: "webp",
        quality: 82,
      });
      image = saved.publicPath;
    }

    let sortOrder = data.sortOrder;
    const sortOrderRaw = String(formData.get("sortOrder") ?? "").trim();
    if (sortOrderRaw === "") {
      const last = await prisma.project.findFirst({
        where: { categoryId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const seo = resolveProjectSeo({
      title: data.title,
      summary: data.summary,
      content: data.content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    const created = await prisma.project.create({
      data: {
        title: data.title,
        slug,
        categoryId,
        clientId,
        summary: data.summary || null,
        content: data.content || null,
        image: image || null,
        projectUrl: data.projectUrl,
        hideProjectUrl: data.hideProjectUrl,
        isFeatured: data.isFeatured,
        projectYear: data.projectYear,
        projectRole: data.projectRole || null,
        projectDuration: data.projectDuration || null,
        sortOrder,
        isActive: data.isActive,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        features: {
          connect: featureIds.map((id) => ({ id })),
        },
      },
    });

    await syncProjectGallery(created.id, data.galleryOrder, data.galleryFiles);
    await syncProjectMetrics(created.id, data.metrics);

    revalidateProjectPaths(created.id);
    revalidatePath("/admin/projects/clients");
    return { success: true, message: "Proje oluşturuldu." };
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return { error: "Seçilen kategori bulunamadı." };
    }
    if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") {
      return { error: "Seçilen müşteri bulunamadı." };
    }
    if (error instanceof Error && error.message === "FEATURE_NOT_FOUND") {
      return { error: "Seçilen özelliklerden biri bulunamadı." };
    }
    console.error(error);
    return { error: "Proje eklenirken bir hata oluştu." };
  }
}

export async function updateProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Proje bulunamadı." };

  const data = parseProjectPayload(formData);
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
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return { error: "Proje bulunamadı." };

    const categoryId = await assertValidProjectCategory(data.categoryId);
    const clientId = await assertValidProjectClient(data.clientId);
    const featureIds = await resolveFeatureIds(data.featureIds);
    const slug = await uniqueProjectSlug(data.slugInput || data.title, id);
    let image = data.existingImage;

    if (data.imageFile instanceof File && data.imageFile.size > 0) {
      const saved = await saveOptimizedImage(data.imageFile, {
        uploadDir: "uploads/projects",
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

    const seo = resolveProjectSeo({
      title: data.title,
      summary: data.summary,
      content: data.content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    await prisma.project.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        categoryId,
        clientId,
        summary: data.summary || null,
        content: data.content || null,
        image: image || null,
        projectUrl: data.projectUrl,
        hideProjectUrl: data.hideProjectUrl,
        isFeatured: data.isFeatured,
        projectYear: data.projectYear,
        projectRole: data.projectRole || null,
        projectDuration: data.projectDuration || null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        ...(data.isActive || categoryId ? { statusNote: null } : {}),
        features: {
          set: featureIds.map((featureId) => ({ id: featureId })),
        },
      },
    });

    await syncProjectGallery(id, data.galleryOrder, data.galleryFiles);
    await syncProjectMetrics(id, data.metrics);

    revalidateProjectPaths(id);
    revalidatePath("/admin/projects/clients");
    return { success: true, message: "Proje güncellendi." };
  } catch (error) {
    if (error instanceof Error && error.message === "CATEGORY_NOT_FOUND") {
      return { error: "Seçilen kategori bulunamadı." };
    }
    if (error instanceof Error && error.message === "CLIENT_NOT_FOUND") {
      return { error: "Seçilen müşteri bulunamadı." };
    }
    if (error instanceof Error && error.message === "FEATURE_NOT_FOUND") {
      return { error: "Seçilen özelliklerden biri bulunamadı." };
    }
    console.error(error);
    return { error: "Proje güncellenirken bir hata oluştu." };
  }
}

export async function deleteProjectAction(formData: FormData): Promise<DeleteProjectResult> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Proje bulunamadı." };

  const existing = await prisma.project.findUnique({
    where: { id },
    include: { gallery: { select: { image: true } } },
  });
  if (!existing) return { error: "Proje bulunamadı." };

  await prisma.project.delete({ where: { id } });

  if (existing.image) await deletePublicAsset(existing.image);
  for (const item of existing.gallery) {
    await deletePublicAsset(item.image);
  }

  revalidateProjectPaths();
  revalidatePath("/admin/projects/clients");
  return { success: true, message: "Proje silindi." };
}

export async function toggleProjectActiveAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.project.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidatePath("/admin/projects");
  revalidatePath("/admin/projects/categories");
}

export async function toggleProjectFeaturedAction(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return;
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.project.update({
    where: { id },
    data: { isFeatured: !existing.isFeatured },
  });

  revalidatePath("/admin/projects");
}
