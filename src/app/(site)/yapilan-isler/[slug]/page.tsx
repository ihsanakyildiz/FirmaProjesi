import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { WorkDetailView } from "@/components/site/work/work-detail-view";
import { prepareRichHtml, stripHtml } from "@/lib/html";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { getSettingsMap } from "@/lib/settings";
import {
  getCachedFallbackWorkSkills,
  getCachedWorkBySlug,
  getCachedWorkSlugs,
} from "@/lib/works";

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

export const revalidate = 60;

type WorkDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const rows = await getCachedWorkSlugs().catch(() => []);
  return rows.map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({
  params,
}: WorkDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const work = await getCachedWorkBySlug(slug).catch(() => null);
  if (!work) return { title: "Çalışma" };

  const settings = await getSettingsMap().catch(
    () => ({}) as Record<string, string>,
  );
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(work.image, perf.cdnUrl);
  const description =
    work.seoDescription || stripHtml(work.summary) || undefined;

  return {
    title: work.seoTitle || work.title,
    description,
    openGraph: {
      title: work.seoTitle || work.title,
      description,
      images: cover ? [{ url: cover }] : undefined,
    },
  };
}

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { slug } = await params;

  const [work, settings] = await Promise.all([
    getCachedWorkBySlug(slug).catch(() => null),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);

  if (!work) notFound();

  const skillMap = new Map<
    string,
    {
      id: string;
      name: string;
      description?: string | null;
      icon?: string | null;
    }
  >();

  for (const project of work.projects) {
    for (const feature of project.features) {
      if (!skillMap.has(feature.id)) {
        skillMap.set(feature.id, feature);
      }
    }
  }

  let skills = Array.from(skillMap.values()).slice(0, 8);

  if (skills.length === 0) {
    skills = await getCachedFallbackWorkSkills().catch(() => []);
  }

  const perf = parsePerformance(settings);
  const cover = withCdnUrl(work.image, perf.cdnUrl);

  if (cover) {
    preload(cover, { as: "image", fetchPriority: "high" });
  }

  const content = prepareRichHtml(work.content, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });

  return (
    <>
      <WorkDetailView
        title={work.title}
        summary={work.summary}
        content={content}
        image={cover}
        categoryName={work.category?.name ?? null}
        categorySlug={work.category?.slug ?? null}
        phone={settings.contact_phone || ""}
        email={settings.contact_email || ""}
        address={settings.contact_address || ""}
        disableThirdParty={perf.disableThirdParty}
        social={{
          facebook: settings.social_facebook || undefined,
          twitter: settings.social_twitter || undefined,
          instagram: settings.social_instagram || undefined,
          linkedin: settings.social_linkedin || undefined,
        }}
        skills={skills}
        relatedProjects={work.projects.map((project) => ({
          id: project.id,
          title: project.title,
          slug: project.slug,
          summary: project.summary,
          image: withCdnUrl(project.image, perf.cdnUrl),
        }))}
      />
      <HomeCta />
    </>
  );
}
