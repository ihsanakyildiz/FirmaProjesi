import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeCta } from "@/components/site/home/home-cta";
import { WorkDetailView } from "@/components/site/work/work-detail-view";
import { stripHtml } from "@/lib/html";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";

type WorkDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: WorkDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const work = await prisma.work.findFirst({
    where: { slug, isActive: true },
    select: { title: true, seoTitle: true, seoDescription: true, summary: true },
  });
  if (!work) return { title: "Çalışma" };
  return {
    title: work.seoTitle || work.title,
    description:
      work.seoDescription || stripHtml(work.summary) || undefined,
  };
}

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { slug } = await params;

  const [work, settings] = await Promise.all([
    prisma.work.findFirst({
      where: { slug, isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        projects: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
          take: 6,
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            features: {
              where: { isActive: true },
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              take: 8,
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
              },
            },
          },
        },
      },
    }),
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
    skills = await prisma.projectFeature.findMany({
      where: { isActive: true, showOnHome: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 6,
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
      },
    });
  }

  return (
    <>
      <WorkDetailView
        title={work.title}
        summary={work.summary}
        content={work.content}
        image={work.image}
        categoryName={work.category?.name ?? null}
        categorySlug={work.category?.slug ?? null}
        phone={settings.contact_phone || ""}
        email={settings.contact_email || ""}
        address={settings.contact_address || ""}
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
        }))}
      />
      <HomeCta />
    </>
  );
}
