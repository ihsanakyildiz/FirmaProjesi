"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  defaultLimitForType,
  getPageSectionTypeMeta,
  isPageSectionType,
  sectionSupportsEyebrow,
  stringifySectionSettings,
  type PageSectionTypeValue,
} from "@/lib/page-sections";
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

function revalidatePublicPage(slug: string) {
  revalidateTag("pages");
  revalidateTag("site");
  revalidatePath(`/${slug}`);
  if (slug === "anasayfa") {
    revalidatePath("/");
  }
}

function parseMetaPayload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const isActive =
    formData.get("isActive") === "on" || formData.get("isActive") === "true";

  return {
    title,
    slugInput,
    seoTitle,
    seoDescription,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
  };
}

export async function createAdvancedPageAction(
  _prev: PageFormState,
  formData: FormData,
): Promise<PageFormState & { pageId?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const data = parseMetaPayload(formData);
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
    const slug = await uniquePageSlug(data.slugInput || data.title);
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
      summary: "",
      content: "",
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    const page = await prisma.page.create({
      data: {
        type: "ADVANCED",
        title: data.title,
        slug,
        sortOrder,
        isActive: data.isActive,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
      },
    });

    revalidatePath("/admin/pages");
    return {
      success: true,
      message: "Gelişmiş sayfa oluşturuldu.",
      pageId: page.id,
    };
  } catch (error) {
    console.error(error);
    return { error: "Sayfa eklenirken bir hata oluştu." };
  }
}

export async function updateAdvancedPageMetaAction(
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

  const data = parseMetaPayload(formData);
  if (!data.title) {
    return { error: "Başlık zorunludur.", fieldErrors: { title: "Zorunlu alan" } };
  }

  try {
    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) return { error: "Sayfa bulunamadı." };
    if (existing.type !== "ADVANCED") {
      return { error: "Bu sayfa gelişmiş tipte değil." };
    }

    const slug = await uniquePageSlug(data.slugInput || data.title, id);
    const seo = resolvePageSeo({
      title: data.title,
      summary: "",
      content: "",
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });

    await prisma.page.update({
      where: { id },
      data: {
        title: data.title,
        slug,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
      },
    });

    revalidatePath("/admin/pages");
    revalidatePath(`/admin/pages/${id}/edit`);
    revalidatePublicPage(slug);
    if (existing.slug !== slug) revalidatePublicPage(existing.slug);
    return { success: true, message: "Sayfa bilgileri güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Sayfa güncellenirken bir hata oluştu." };
  }
}

export type SectionFormState = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function requireAdvancedPage(pageId: string) {
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) throw new Error("PAGE_NOT_FOUND");
  if (page.type !== "ADVANCED") throw new Error("NOT_ADVANCED");
  return page;
}

export async function addPageSectionAction(
  pageId: string,
  typeRaw: string,
): Promise<SectionFormState> {
  try {
    await requireAdmin();
    const page = await requireAdvancedPage(pageId);
    if (!isPageSectionType(typeRaw)) {
      return { error: "Geçersiz bölüm tipi." };
    }
    const type = typeRaw as PageSectionTypeValue;
    const meta = getPageSectionTypeMeta(type);
    const last = await prisma.pageSection.findFirst({
      where: { pageId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    await prisma.pageSection.create({
      data: {
        pageId,
        type,
        label: meta.defaultLabel,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        settings: stringifySectionSettings({
          limit: defaultLimitForType(type),
          showFeatures: type === "PROJECTS",
        }),
      },
    });

    revalidatePath(`/admin/pages/${pageId}/edit`);
    revalidatePublicPage(page.slug);
    return { success: true, message: "Bölüm eklendi." };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return { error: "Oturum bulunamadı." };
      if (error.message === "PAGE_NOT_FOUND") return { error: "Sayfa bulunamadı." };
      if (error.message === "NOT_ADVANCED") return { error: "Bu sayfa gelişmiş değil." };
    }
    console.error(error);
    return { error: "Bölüm eklenirken hata oluştu." };
  }
}

export async function deletePageSectionAction(
  sectionId: string,
): Promise<SectionFormState> {
  try {
    await requireAdmin();
    const section = await prisma.pageSection.findUnique({
      where: { id: sectionId },
      include: { page: { select: { id: true, slug: true, type: true } } },
    });
    if (!section || section.page.type !== "ADVANCED") {
      return { error: "Bölüm bulunamadı." };
    }

    await prisma.pageSection.delete({ where: { id: sectionId } });
    revalidatePath(`/admin/pages/${section.page.id}/edit`);
    revalidatePublicPage(section.page.slug);
    return { success: true, message: "Bölüm silindi." };
  } catch (error) {
    console.error(error);
    return { error: "Bölüm silinirken hata oluştu." };
  }
}

export async function movePageSectionAction(
  sectionId: string,
  direction: "up" | "down",
): Promise<SectionFormState> {
  try {
    await requireAdmin();
    const section = await prisma.pageSection.findUnique({
      where: { id: sectionId },
      include: { page: { select: { id: true, slug: true, type: true } } },
    });
    if (!section || section.page.type !== "ADVANCED") {
      return { error: "Bölüm bulunamadı." };
    }

    const siblings = await prisma.pageSection.findMany({
      where: { pageId: section.pageId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, sortOrder: true },
    });
    const index = siblings.findIndex((item) => item.id === sectionId);
    if (index < 0) return { error: "Bölüm bulunamadı." };
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) {
      return { success: true, message: "Sıra değişmedi." };
    }

    const current = siblings[index]!;
    const target = siblings[swapIndex]!;
    await prisma.$transaction([
      prisma.pageSection.update({
        where: { id: current.id },
        data: { sortOrder: target.sortOrder },
      }),
      prisma.pageSection.update({
        where: { id: target.id },
        data: { sortOrder: current.sortOrder },
      }),
    ]);

    // Normalize order to avoid collisions
    const refreshed = await prisma.pageSection.findMany({
      where: { pageId: section.pageId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    await prisma.$transaction(
      refreshed.map((item, order) =>
        prisma.pageSection.update({
          where: { id: item.id },
          data: { sortOrder: order },
        }),
      ),
    );

    revalidatePath(`/admin/pages/${section.page.id}/edit`);
    revalidatePublicPage(section.page.slug);
    return { success: true, message: "Sıra güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Sıra güncellenirken hata oluştu." };
  }
}

export async function reorderPageSectionsAction(
  pageId: string,
  orderedIds: string[],
): Promise<SectionFormState> {
  try {
    await requireAdmin();
    const page = await requireAdvancedPage(pageId);

    const uniqueIds = [...new Set(orderedIds.map((id) => id.trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return { error: "Sıralama listesi boş." };
    }

    const existing = await prisma.pageSection.findMany({
      where: { pageId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((item) => item.id));
    if (
      uniqueIds.length !== existing.length ||
      uniqueIds.some((id) => !existingIds.has(id))
    ) {
      return { error: "Bölüm listesi güncel değil; sayfayı yenileyip tekrar deneyin." };
    }

    await prisma.$transaction(
      uniqueIds.map((id, order) =>
        prisma.pageSection.update({
          where: { id },
          data: { sortOrder: order },
        }),
      ),
    );

    revalidatePath(`/admin/pages/${pageId}/edit`);
    revalidatePublicPage(page.slug);
    return { success: true, message: "Sıra güncellendi." };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return { error: "Oturum bulunamadı." };
      if (error.message === "PAGE_NOT_FOUND") return { error: "Sayfa bulunamadı." };
      if (error.message === "NOT_ADVANCED") return { error: "Bu sayfa gelişmiş değil." };
    }
    console.error(error);
    return { error: "Sıra güncellenirken hata oluştu." };
  }
}

export async function togglePageSectionActiveAction(
  sectionId: string,
): Promise<SectionFormState> {
  try {
    await requireAdmin();
    const section = await prisma.pageSection.findUnique({
      where: { id: sectionId },
      include: { page: { select: { id: true, slug: true, type: true } } },
    });
    if (!section || section.page.type !== "ADVANCED") {
      return { error: "Bölüm bulunamadı." };
    }

    await prisma.pageSection.update({
      where: { id: sectionId },
      data: { isActive: !section.isActive },
    });

    revalidatePath(`/admin/pages/${section.page.id}/edit`);
    revalidatePublicPage(section.page.slug);
    return { success: true, message: "Bölüm durumu güncellendi." };
  } catch (error) {
    console.error(error);
    return { error: "Durum güncellenirken hata oluştu." };
  }
}

export async function updatePageSectionAction(
  _prev: SectionFormState,
  formData: FormData,
): Promise<SectionFormState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const sectionId = String(formData.get("sectionId") ?? "").trim();
  if (!sectionId) return { error: "Bölüm bulunamadı." };

  try {
    const section = await prisma.pageSection.findUnique({
      where: { id: sectionId },
      include: { page: { select: { id: true, slug: true, type: true } } },
    });
    if (!section || section.page.type !== "ADVANCED") {
      return { error: "Bölüm bulunamadı." };
    }

    const type = section.type as PageSectionTypeValue;
    const label = String(formData.get("label") ?? "").trim() || null;
    const title = String(formData.get("title") ?? "").trim() || null;
    const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
    const content = String(formData.get("content") ?? "").trim() || null;
    const heroId = String(formData.get("heroId") ?? "").trim() || null;
    const faqGroupId = String(formData.get("faqGroupId") ?? "").trim() || null;
    const projectCategoryId =
      String(formData.get("projectCategoryId") ?? "").trim() || null;
    const workCategoryId =
      String(formData.get("workCategoryId") ?? "").trim() || null;
    const blogCategoryId =
      String(formData.get("blogCategoryId") ?? "").trim() || null;
    const limitRaw = Number.parseInt(String(formData.get("limit") ?? ""), 10);
    const showFeatures =
      formData.get("showFeatures") === "on" ||
      formData.get("showFeatures") === "true";
    const anchorId = String(formData.get("anchorId") ?? "").trim();
    const eyebrow = String(formData.get("eyebrow") ?? "").trim();
    const statValue = String(formData.get("statValue") ?? "").trim();
    const statDescription = String(formData.get("statDescription") ?? "").trim();
    const ctaLabel = String(formData.get("ctaLabel") ?? "").trim();
    const ctaUrl = String(formData.get("ctaUrl") ?? "").trim();
    const pricingPrimaryCtaLabel = String(
      formData.get("pricingPrimaryCtaLabel") ?? "",
    ).trim();
    const pricingPrimaryCtaUrl = String(
      formData.get("pricingPrimaryCtaUrl") ?? "",
    ).trim();
    const pricingSecondaryCtaLabel = String(
      formData.get("pricingSecondaryCtaLabel") ?? "",
    ).trim();
    const pricingSecondaryCtaUrl = String(
      formData.get("pricingSecondaryCtaUrl") ?? "",
    ).trim();
    const showPrimaryCta =
      formData.get("showPrimaryCta") === "on" ||
      formData.get("showPrimaryCta") === "true";
    const primaryCtaLabel = String(formData.get("primaryCtaLabel") ?? "").trim();
    const primaryCtaUrl = String(formData.get("primaryCtaUrl") ?? "").trim();
    const showSecondaryCta =
      formData.get("showSecondaryCta") === "on" ||
      formData.get("showSecondaryCta") === "true";
    const secondaryCtaLabel = String(
      formData.get("secondaryCtaLabel") ?? "",
    ).trim();
    const secondaryCtaUrl = String(formData.get("secondaryCtaUrl") ?? "").trim();
    const enableSlider =
      formData.get("enableSlider") === "on" ||
      formData.get("enableSlider") === "true";
    const sliderAutoplay =
      formData.get("sliderAutoplay") === "on" ||
      formData.get("sliderAutoplay") === "true";
    const sliderEffectRaw = String(formData.get("sliderEffect") ?? "slide").trim();
    const cardsPerRowRaw = Number.parseInt(
      String(formData.get("cardsPerRow") ?? "3"),
      10,
    );
    const cardsPerRow =
      cardsPerRowRaw === 4 || cardsPerRowRaw === 5 ? cardsPerRowRaw : 3;

    const cardIds = formData
      .getAll("cardIds")
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
    const workIds = formData
      .getAll("workIds")
      .map((value) => String(value).trim())
      .filter(Boolean);

    const settings = stringifySectionSettings({
      limit: Number.isFinite(limitRaw) ? limitRaw : defaultLimitForType(type),
      showFeatures: type === "PROJECTS" ? showFeatures : undefined,
      anchorId: anchorId || undefined,
      eyebrow: sectionSupportsEyebrow(type) ? eyebrow || undefined : undefined,
      ...(type === "PROJECTS"
        ? {
            statValue: statValue || undefined,
            statDescription: statDescription || undefined,
          }
        : {}),
      ctaLabel: type === "CTA" ? ctaLabel || undefined : undefined,
      ctaUrl: type === "CTA" ? ctaUrl || undefined : undefined,
      ...(type === "PRICING"
        ? {
            pricingPrimaryCtaLabel: pricingPrimaryCtaLabel || undefined,
            pricingPrimaryCtaUrl: pricingPrimaryCtaUrl || undefined,
            pricingSecondaryCtaLabel: pricingSecondaryCtaLabel || undefined,
            pricingSecondaryCtaUrl: pricingSecondaryCtaUrl || undefined,
          }
        : {}),
      ...(type === "CARDS"
        ? {
            showPrimaryCta,
            primaryCtaLabel: primaryCtaLabel || undefined,
            primaryCtaUrl: primaryCtaUrl || undefined,
            showSecondaryCta,
            secondaryCtaLabel: secondaryCtaLabel || undefined,
            secondaryCtaUrl: secondaryCtaUrl || undefined,
          }
        : {}),
      ...(type === "CARDS" || type === "BLOG"
        ? {
            enableSlider,
            sliderAutoplay: enableSlider ? sliderAutoplay : undefined,
            sliderEffect:
              sliderEffectRaw === "fade" ||
              sliderEffectRaw === "coverflow" ||
              sliderEffectRaw === "cards" ||
              sliderEffectRaw === "slide"
                ? sliderEffectRaw
                : "slide",
            cardsPerRow,
          }
        : {}),
    });

    await prisma.$transaction(async (tx) => {
      await tx.pageSection.update({
        where: { id: sectionId },
        data: {
          label,
          title,
          subtitle,
          content,
          settings,
          heroId: type === "HERO" ? heroId : null,
          faqGroupId: type === "FAQ" ? faqGroupId : null,
          projectCategoryId: type === "PROJECTS" ? projectCategoryId : null,
          workCategoryId: type === "WORKS" ? workCategoryId : null,
          blogCategoryId: type === "BLOG" ? blogCategoryId : null,
        },
      });

      if (type === "CARDS" || type === "ADVANCED_CARD") {
        await tx.pageSectionCard.deleteMany({ where: { sectionId } });
        if (cardIds.length > 0) {
          await tx.pageSectionCard.createMany({
            data: cardIds.map((cardId, index) => ({
              sectionId,
              cardId,
              sortOrder: index,
            })),
          });
        }
      }

      if (type === "PROJECTS") {
        await tx.pageSectionProject.deleteMany({ where: { sectionId } });
        if (projectIds.length > 0) {
          await tx.pageSectionProject.createMany({
            data: projectIds.map((projectId, index) => ({
              sectionId,
              projectId,
              sortOrder: index,
            })),
          });
        }
      }

      if (type === "BLOG") {
        await tx.pageSectionPost.deleteMany({ where: { sectionId } });
        if (postIds.length > 0) {
          await tx.pageSectionPost.createMany({
            data: postIds.map((postId, index) => ({
              sectionId,
              postId,
              sortOrder: index,
            })),
          });
        }
      }

      if (type === "WORKS") {
        await tx.pageSectionWork.deleteMany({ where: { sectionId } });
        if (workIds.length > 0) {
          await tx.pageSectionWork.createMany({
            data: workIds.map((workId, index) => ({
              sectionId,
              workId,
              sortOrder: index,
            })),
          });
        }
      }
    });

    revalidatePath(`/admin/pages/${section.page.id}/edit`);
    revalidatePublicPage(section.page.slug);
    return { success: true, message: "Bölüm kaydedildi." };
  } catch (error) {
    console.error(error);
    return { error: "Bölüm kaydedilirken hata oluştu." };
  }
}
