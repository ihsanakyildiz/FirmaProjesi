import { prisma } from "@/lib/prisma";

export const HERO_LAYOUTS = [
  { value: "SPLIT_COLLAGE", label: "Split + kolaj" },
  { value: "FULL_BLEED", label: "Tam genişlik" },
  { value: "CENTERED", label: "Ortalı" },
] as const;

export type HeroLayoutValue = (typeof HERO_LAYOUTS)[number]["value"];

export const HERO_BACKGROUND_STYLES = [
  { value: "grid", label: "Izgara" },
  { value: "plain", label: "Düz" },
  { value: "soft-gradient", label: "Yumuşak gradient" },
] as const;

export type HeroBackgroundStyle = (typeof HERO_BACKGROUND_STYLES)[number]["value"];

export const HERO_MEDIA_LIMITS = {
  LOGO: 8,
  COLLAGE: 6,
  AVATAR: 6,
} as const;

export type HeroMediaKindValue = keyof typeof HERO_MEDIA_LIMITS;

export const DEFAULT_HERO_SLIDE = {
  badgeText: "Free Lifetime Update",
  badgeIcon: "rocket",
  headline: "Elevate your brand with Infinia.",
  headlineAccent: "Infinia.",
  subheadline:
    "Access top-tier group mentoring plans and exclusive professional benefits for your team.",
  ctaLabel: "Get Started",
  ctaUrl: "#",
  trustLabel: "Trusted by the best",
  overlayPercent: 0,
  titleColor: "#0f172a",
  accentColor: "#7c3aed",
  subtitleColor: "#64748b",
  ctaBgColor: "#7c3aed",
  ctaTextColor: "#ffffff",
  titleFont: "",
  layout: "SPLIT_COLLAGE" as HeroLayoutValue,
  backgroundStyle: "grid" as HeroBackgroundStyle,
  themeColor: "#7c3aed",
  showStars: true,
  starCount: 5,
  showAvatars: true,
};

export async function getHeroBySlug(slug: string) {
  return prisma.hero.findFirst({
    where: { slug, isActive: true },
    include: {
      slides: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          media: {
            orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
          },
        },
      },
    },
  });
}
