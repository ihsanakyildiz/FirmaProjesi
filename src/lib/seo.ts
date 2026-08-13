import { stripHtml } from "@/lib/html";

/** Google SERP için önerilen üst sınırlar */
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function clampSeoText(value: string, maxLength: number) {
  return value.slice(0, maxLength);
}

/** Kelime ortasında kesmeden güvenli kısaltma (otomatik üretim için) */
export function truncateSeoText(value: string, maxLength: number) {
  const text = collapseWhitespace(value);
  if (text.length <= maxLength) return text;

  const sliced = text.slice(0, maxLength + 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const base = lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : text.slice(0, maxLength);
  return `${base.trimEnd()}…`.slice(0, maxLength);
}

export type ResolveWorkSeoInput = {
  title: string;
  summary?: string | null;
  content?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type ResolvedWorkSeo = {
  seoTitle: string;
  seoDescription: string;
  titleAuto: boolean;
  descriptionAuto: boolean;
};

/**
 * Admin SEO alanlarını boş bırakırsa başlık + kısa özettten (yoksa içerikten) üretir.
 * Manuel değerler karakter limitine zorlanır.
 */
export function resolveWorkSeo(input: ResolveWorkSeoInput): ResolvedWorkSeo {
  const title = collapseWhitespace(input.title);
  const manualTitle = clampSeoText(collapseWhitespace(input.seoTitle ?? ""), SEO_TITLE_MAX);
  const manualDescription = clampSeoText(
    collapseWhitespace(input.seoDescription ?? ""),
    SEO_DESCRIPTION_MAX,
  );

  const summaryText = stripHtml(input.summary);
  const contentText = stripHtml(input.content);
  const autoDescriptionSource = summaryText || contentText || title;

  const seoTitle = manualTitle || truncateSeoText(title, SEO_TITLE_MAX);
  const seoDescription =
    manualDescription || truncateSeoText(autoDescriptionSource, SEO_DESCRIPTION_MAX);

  return {
    seoTitle: clampSeoText(seoTitle, SEO_TITLE_MAX),
    seoDescription: clampSeoText(seoDescription, SEO_DESCRIPTION_MAX),
    titleAuto: !manualTitle,
    descriptionAuto: !manualDescription,
  };
}

/** Projeler için aynı SEO üretim kuralları */
export const resolveProjectSeo = resolveWorkSeo;
export type ResolveProjectSeoInput = ResolveWorkSeoInput;

/** Blog yazıları için aynı SEO üretim kuralları */
export const resolveBlogSeo = resolveWorkSeo;
export type ResolveBlogSeoInput = ResolveWorkSeoInput;

/** Klasik sayfalar için aynı SEO üretim kuralları */
export const resolvePageSeo = resolveWorkSeo;
export type ResolvePageSeoInput = ResolveWorkSeoInput;
