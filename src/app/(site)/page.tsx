import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { HomeHero } from "@/components/site/home/home-hero";
import { PageSectionsRenderer } from "@/components/site/page-sections-renderer";
import { DEFAULT_HERO_SLIDE, getHeroBySlug } from "@/lib/heroes";
import { getFaqGroupBySlug } from "@/lib/faqs";
import { getCachedHomepageAdvanced } from "@/lib/pages";
import { getActivePricingPlans } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";

export const revalidate = 60;

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);
const HomeFaq = dynamic(() =>
  import("@/components/site/home/home-faq").then((mod) => mod.HomeFaq),
);
const HomeInsights = dynamic(() =>
  import("@/components/site/home/home-insights").then((mod) => mod.HomeInsights),
);
const HomePricing = dynamic(() =>
  import("@/components/site/home/home-pricing").then((mod) => mod.HomePricing),
);
const HomeProjects = dynamic(() =>
  import("@/components/site/home/home-projects").then((mod) => mod.HomeProjects),
);
const HomeServices = dynamic(() =>
  import("@/components/site/home/home-services").then((mod) => mod.HomeServices),
);
const HomeTrusted = dynamic(() =>
  import("@/components/site/home/home-trusted").then((mod) => mod.HomeTrusted),
);
const HomeWhyUs = dynamic(() =>
  import("@/components/site/home/home-why-us").then((mod) => mod.HomeWhyUs),
);
const HomeWorks = dynamic(() =>
  import("@/components/site/home/home-works").then((mod) => mod.HomeWorks),
);

export async function generateMetadata(): Promise<Metadata> {
  const advanced = await getCachedHomepageAdvanced().catch(() => null);
  if (advanced) {
    return {
      title: advanced.seoTitle || advanced.title || "Ana Sayfa",
      description:
        advanced.seoDescription ||
        "Web tasarım, yazılım ve dijital çözümler stüdyosu",
    };
  }
  return {
    title: "Ana Sayfa",
    description: "Web tasarım, yazılım ve dijital çözümler stüdyosu",
  };
}

export default async function HomePage() {
  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const siteName = settings.site_name || "İhsan Akyıldız";

  const advancedHome = await getCachedHomepageAdvanced().catch(() => null);
  if (advancedHome) {
    return (
      <PageSectionsRenderer
        sections={advancedHome.sections}
        siteName={siteName}
      />
    );
  }

  const [hero, cards, clients, projects, projectFeatures, works, workCategories, posts, faqGroup, pricingPlans] =
    await Promise.all([
    getHeroBySlug("anasayfa-hero").catch(() => null),
    prisma.card
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      })
      .catch(() => []),
    prisma.projectClient
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          logo: true,
          website: true,
          sector: true,
        },
      })
      .catch(() => []),
    prisma.project
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        take: 12,
        select: {
          id: true,
          title: true,
          summary: true,
          slug: true,
          image: true,
        },
      })
      .catch(() => []),
    prisma.projectFeature
      .findMany({
        where: { isActive: true, showOnHome: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: 8,
        select: {
          id: true,
          name: true,
          description: true,
        },
      })
      .catch(() => []),
    prisma.work
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
        take: 18,
        select: {
          id: true,
          title: true,
          slug: true,
          image: true,
          previewImage: true,
          categoryId: true,
          category: { select: { id: true, name: true } },
        },
      })
      .catch(() => []),
    prisma.workCategory
      .findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
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
    getActivePricingPlans().catch(() => []),
  ]);

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

  const classicCards = cards.filter((card) => card.type === "CLASSIC").slice(0, 6);
  const advancedCard =
    cards.find((card) => card.type === "ADVANCED") ?? null;

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

      <HomeTrusted
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          logo: client.logo,
          website: client.website,
          sector: client.sector,
        }))}
      />

      <div id="hizmetler">
        <HomeServices
          items={classicCards.map((card) => ({
            title: card.title,
            href: card.href || "/hizmetler",
            icon: card.icon,
            image: card.image,
            mediaType: card.mediaType,
            description: card.description ?? undefined,
          }))}
        />
      </div>

      <HomeWhyUs
        card={
          advancedCard
            ? {
                title: advancedCard.title,
                badgeText: advancedCard.badgeText,
                subtitle: advancedCard.subtitle,
                description: advancedCard.description,
                features: advancedCard.features,
                layout: advancedCard.layout,
                image: advancedCard.image,
                showFrame: advancedCard.showFrame,
                showSparkles: advancedCard.showSparkles,
                videoLabel: advancedCard.videoLabel,
                videoUrl: advancedCard.videoUrl,
                profileName: advancedCard.profileName,
                profileRole: advancedCard.profileRole,
                profileImage: advancedCard.profileImage,
                statValue: advancedCard.statValue,
                statLabel: advancedCard.statLabel,
              }
            : null
        }
      />

      <div id="projeler">
        <HomeProjects
          features={projectFeatures.map((feature) => ({
            id: feature.id,
            name: feature.name,
            description: feature.description,
          }))}
          projects={projects.map((project) => ({
            title: project.title,
            summary: project.summary || "Detaylar için projeyi inceleyin.",
            image: project.image,
            href: `/projeler/${project.slug}`,
          }))}
        />
      </div>

      <div id="yapilan-isler">
        <HomeWorks
          categories={workCategories
            .filter((category) =>
              works.some((work) => work.categoryId === category.id),
            )
            .map((category) => ({
              id: category.id,
              name: category.name,
            }))}
          works={works.map((work) => ({
            id: work.id,
            title: work.title,
            href: `/yapilan-isler/${work.slug}`,
            image: work.image,
            previewImage: work.previewImage,
            categoryId: work.categoryId,
            categoryName: work.category?.name ?? null,
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
        <HomePricing plans={pricingPlans} />
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
