import type { Metadata } from "next";
import { HomeCta } from "@/components/site/home/home-cta";
import { HomeFaq } from "@/components/site/home/home-faq";
import { HomeHero } from "@/components/site/home/home-hero";
import { HomeInsights } from "@/components/site/home/home-insights";
import { HomePricing } from "@/components/site/home/home-pricing";
import { HomeProjects } from "@/components/site/home/home-projects";
import { HomeServices } from "@/components/site/home/home-services";
import { HomeTrusted } from "@/components/site/home/home-trusted";
import { HomeWhyUs } from "@/components/site/home/home-why-us";
import { DEFAULT_HERO_SLIDE, getHeroBySlug } from "@/lib/heroes";
import { getFaqGroupBySlug } from "@/lib/faqs";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Ana Sayfa",
  description: "Web tasarım, yazılım ve dijital çözümler stüdyosu",
};

export default async function HomePage() {
  const [settings, hero, cards, projects, posts, faqGroup] = await Promise.all([
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    getHeroBySlug("anasayfa-hero").catch(() => null),
    prisma.card
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 6,
      })
      .catch(() => []),
    prisma.project
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        take: 3,
        select: {
          id: true,
          title: true,
          summary: true,
          slug: true,
          image: true,
        },
      })
      .catch(() => []),
    prisma.blogPost
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        take: 3,
        select: {
          id: true,
          title: true,
          summary: true,
          slug: true,
          image: true,
          category: { select: { name: true } },
        },
      })
      .catch(() => []),
    getFaqGroupBySlug("anasayfa-sss").catch(() => null),
  ]);

  const siteName = settings.site_name || "İhsan Akyıldız";
  const slide = hero?.slides?.[0];
  const collage =
    slide?.media
      ?.filter((item) => item.kind === "COLLAGE")
      .map((item) => ({ src: item.image, alt: item.alt || item.label || siteName })) ?? [];
  const logos =
    slide?.media
      ?.filter((item) => item.kind === "LOGO")
      .map((item) => ({
        src: item.image,
        alt: item.alt || item.label || "Logo",
        label: item.label || "Logo",
      })) ?? [];

  return (
    <>
      <HomeHero
        siteName={siteName}
        badgeText={slide?.badgeText ?? DEFAULT_HERO_SLIDE.badgeText}
        headline={slide?.headline ?? DEFAULT_HERO_SLIDE.headline}
        headlineAccent={slide?.headlineAccent ?? DEFAULT_HERO_SLIDE.headlineAccent}
        subheadline={slide?.subheadline ?? DEFAULT_HERO_SLIDE.subheadline}
        ctaLabel={slide?.ctaLabel ?? DEFAULT_HERO_SLIDE.ctaLabel}
        ctaUrl={slide?.ctaUrl ?? "/iletisim"}
        trustLabel={slide?.trustLabel ?? DEFAULT_HERO_SLIDE.trustLabel}
        showStars={slide?.showStars ?? true}
        starCount={slide?.starCount ?? 5}
        showAvatars={slide?.showAvatars ?? true}
        collageImages={collage}
        logos={logos}
        backgroundStyle={slide?.backgroundStyle ?? "grid"}
      />

      <HomeTrusted />

      <div id="hizmetler">
        <HomeServices
          items={cards.map((card) => ({
            title: card.title,
            href: card.href || "/hizmetler",
            icon: card.icon,
            description: undefined,
          }))}
        />
      </div>

      <HomeWhyUs />

      <div id="projeler">
        <HomeProjects
          projects={projects.map((project) => ({
            title: project.title,
            summary: project.summary || "Detaylar için projeyi inceleyin.",
            image: project.image,
            href: `/projeler/${project.slug}`,
          }))}
        />
      </div>

      <HomeInsights
        posts={posts.map((post) => ({
          title: post.title,
          summary: post.summary || "Yazıyı okumak için tıklayın.",
          image: post.image,
          category: post.category?.name,
          href: `/blog/${post.slug}`,
        }))}
      />

      <div id="fiyatlandirma">
        <HomePricing />
      </div>

      <div id="sss">
        <HomeFaq
          items={faqGroup?.items.map((item) => ({
            id: item.id,
            question: item.question,
            answer: item.answer,
          }))}
        />
      </div>

      <HomeCta />
    </>
  );
}
