import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  CheckCircle2,
  FileArchive,
  FileText,
  Phone,
  Share2,
} from "lucide-react";
import { HomeCta } from "@/components/site/home/home-cta";
import { ProjectFaqAccordion } from "@/components/site/project/project-faq-accordion";
import { ProjectQuoteForm } from "@/components/site/project/project-quote-form";
import { LucideIconByName } from "@/lib/lucide-icons";
import { parseProjectHighlights } from "@/lib/project-portfolio";
import { prisma } from "@/lib/prisma";
import { getSettingsMap } from "@/lib/settings";
import { stripHtml } from "@/lib/html";

type ProjectDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await prisma.project.findFirst({
    where: { slug, isActive: true },
    select: { title: true, seoTitle: true, seoDescription: true, summary: true },
  });
  if (!project) return { title: "Proje" };
  return {
    title: project.seoTitle || project.title,
    description:
      project.seoDescription ||
      stripHtml(project.summary) ||
      undefined,
  };
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { slug } = await params;

  const [project, settings] = await Promise.all([
    prisma.project.findFirst({
      where: { slug, isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        client: { select: { name: true, logo: true } },
        features: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            iconColor: true,
          },
        },
        gallery: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, image: true, alt: true },
        },
        metrics: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, label: true, value: true },
        },
        faqGroup: {
          include: {
            items: {
              where: { isActive: true },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              select: { id: true, question: true, answer: true },
            },
          },
        },
      },
    }),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);

  if (!project) notFound();

  const siblingProjects = await prisma.project.findMany({
    where: {
      isActive: true,
      ...(project.categoryId
        ? { categoryId: project.categoryId }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    take: 10,
    select: { id: true, title: true, slug: true },
  });

  const highlights = parseProjectHighlights(project.highlights);
  const phone = settings.contact_phone || "";
  const sideImage = project.gallery[0]?.image ?? null;
  const summaryText = stripHtml(project.summary);

  return (
    <>
      <section className="relative overflow-hidden border-b border-site-border bg-site-surface py-14">
        <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="text-sm text-site-muted">
            <Link href="/" className="hover:text-site-primary">
              Ana Sayfa
            </Link>
            <span className="mx-2">›</span>
            <Link href="/projeler" className="hover:text-site-primary">
              Projeler
            </Link>
            {project.category ? (
              <>
                <span className="mx-2">›</span>
                <span>{project.category.name}</span>
              </>
            ) : null}
          </nav>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
            {project.title}
          </h1>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12 lg:px-8">
          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl border border-site-border bg-site-card p-4 shadow-sm">
              <p className="px-2 text-xs font-semibold tracking-wide text-site-muted uppercase">
                Projeler
              </p>
              <ul className="mt-2 space-y-1">
                {siblingProjects.map((item) => {
                  const active = item.id === project.id;
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/projeler/${item.slug}`}
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                          active
                            ? "bg-site-primary-soft font-semibold text-site-primary"
                            : "text-site-fg hover:bg-site-surface"
                        }`}
                      >
                        <span className="truncate">{item.title}</span>
                        {active ? <ArrowUpRight className="h-4 w-4" /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {(project.brochurePdf || project.brochureZip) && (
              <div className="rounded-3xl border border-site-border bg-site-card p-5 shadow-sm">
                <h3 className="font-display text-lg font-semibold text-site-fg">
                  Proje Dosyaları
                </h3>
                <div className="mt-4 space-y-3">
                  {project.brochurePdf ? (
                    <a
                      href={project.brochurePdf}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-site-border px-3 py-3 text-sm font-medium text-site-fg transition hover:border-site-primary/40"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-site-primary-soft text-site-primary">
                        <FileText className="h-5 w-5" />
                      </span>
                      PDF Broşür
                    </a>
                  ) : null}
                  {project.brochureZip ? (
                    <a
                      href={project.brochureZip}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-site-border px-3 py-3 text-sm font-medium text-site-fg transition hover:border-site-primary/40"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-site-primary-soft text-site-primary">
                        <FileArchive className="h-5 w-5" />
                      </span>
                      ZIP Paketi
                    </a>
                  ) : null}
                </div>
              </div>
            )}

            <div className="rounded-3xl bg-site-primary p-6 text-white shadow-lg shadow-violet-500/20">
              <p className="font-display text-xl font-semibold leading-snug">
                Dijital deneyiminizi bir üst seviyeye taşıyalım.
              </p>
              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="mt-5 flex items-center gap-2 text-sm font-semibold text-white/95"
                >
                  <Phone className="h-4 w-4" />
                  {phone}
                </a>
              ) : null}
              <Link
                href="/iletisim"
                className="mt-5 inline-flex rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-site-primary"
              >
                Ücretsiz Teklif
              </Link>
            </div>

            <ProjectQuoteForm projectTitle={project.title} />
          </aside>

          <div>
            {project.image ? (
              <div className="relative aspect-[16/9] overflow-hidden rounded-[1.75rem] border border-site-border shadow-sm">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 70vw"
                />
              </div>
            ) : null}

            {(project.projectYear ||
              project.projectRole ||
              project.projectDuration ||
              project.client ||
              (!project.hideProjectUrl && project.projectUrl)) && (
              <div className="mt-6 grid gap-3 rounded-3xl border border-site-border bg-site-card p-5 sm:grid-cols-2 lg:grid-cols-4">
                {project.client ? (
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-site-muted uppercase">
                      Müşteri
                    </p>
                    <p className="mt-1 text-sm font-semibold text-site-fg">
                      {project.client.name}
                    </p>
                  </div>
                ) : null}
                {project.projectYear ? (
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-site-muted uppercase">
                      Yıl
                    </p>
                    <p className="mt-1 text-sm font-semibold text-site-fg">
                      {project.projectYear}
                    </p>
                  </div>
                ) : null}
                {project.projectRole ? (
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-site-muted uppercase">
                      Rol
                    </p>
                    <p className="mt-1 text-sm font-semibold text-site-fg">
                      {project.projectRole}
                    </p>
                  </div>
                ) : null}
                {project.projectDuration ? (
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-site-muted uppercase">
                      Süre
                    </p>
                    <p className="mt-1 text-sm font-semibold text-site-fg">
                      {project.projectDuration}
                    </p>
                  </div>
                ) : null}
                {!project.hideProjectUrl && project.projectUrl ? (
                  <div className="sm:col-span-2 lg:col-span-4">
                    <a
                      href={project.projectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-site-primary"
                    >
                      Canlı projeyi gör
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                ) : null}
              </div>
            )}

            {project.content ? (
              <div
                className="site-rich-content mt-8"
                dangerouslySetInnerHTML={{ __html: project.content }}
              />
            ) : null}

            {highlights.length > 0 ? (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2.5 text-sm font-medium text-site-fg"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-site-primary" />
                    {item}
                  </div>
                ))}
              </div>
            ) : null}

            {project.features.length > 0 ? (
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {project.features.map((feature) => (
                  <div
                    key={feature.id}
                    className="rounded-2xl border border-site-border bg-site-card p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-site-primary-soft"
                        style={{ color: feature.iconColor || undefined }}
                      >
                        <LucideIconByName
                          name={feature.icon ?? "Sparkles"}
                          className={`h-5 w-5 ${feature.iconColor ? "" : "text-site-primary"}`}
                        />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-site-fg">
                          {feature.name}
                        </p>
                        {feature.description ? (
                          <p className="mt-1 text-sm text-site-muted">
                            {feature.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {sideImage ? (
              <div className="mt-10 grid items-center gap-6 md:grid-cols-2">
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-site-border">
                  <Image
                    src={sideImage}
                    alt={project.gallery[0]?.alt || project.title}
                    fill
                    className="object-cover"
                    sizes="(max-width:768px) 100vw, 35vw"
                  />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-site-fg">
                    Dijital dönüşüm
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-site-muted">
                    {summaryText ||
                      "Tasarım, geliştirme ve büyüme odaklı bir yaklaşımla projenizi uçtan uca hayata geçiriyoruz."}
                  </p>
                  {project.metrics.length > 0 ? (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {project.metrics.map((metric) => (
                        <div
                          key={metric.id}
                          className="rounded-2xl border border-site-border bg-site-card px-3 py-3"
                        >
                          <p className="text-xl font-extrabold text-site-primary">
                            {metric.value}
                          </p>
                          <p className="text-xs text-site-muted">{metric.label}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : project.metrics.length > 0 ? (
              <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {project.metrics.map((metric) => (
                  <div
                    key={metric.id}
                    className="rounded-2xl border border-site-border bg-site-card px-4 py-4"
                  >
                    <p className="text-2xl font-extrabold text-site-primary">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-xs text-site-muted">{metric.label}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {project.gallery.length > 1 ? (
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {project.gallery.slice(1).map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-[16/11] overflow-hidden rounded-3xl border border-site-border"
                  >
                    <Image
                      src={item.image}
                      alt={item.alt || project.title}
                      fill
                      className="object-cover"
                      sizes="(max-width:768px) 100vw, 35vw"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {project.faqGroup?.items?.length ? (
              <ProjectFaqAccordion items={project.faqGroup.items} />
            ) : null}

            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-site-border pt-6">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-site-muted">
                <Share2 className="h-4 w-4" />
                Paylaş
              </span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(project.title)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-site-border px-3 py-1.5 text-xs font-semibold text-site-fg hover:border-site-primary/40"
              >
                X
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`/projeler/${project.slug}`)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-site-border px-3 py-1.5 text-xs font-semibold text-site-fg hover:border-site-primary/40"
              >
                LinkedIn
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`/projeler/${project.slug}`)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-site-border px-3 py-1.5 text-xs font-semibold text-site-fg hover:border-site-primary/40"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>
      </section>

      <HomeCta />
    </>
  );
}
