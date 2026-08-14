import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  FileArchive,
  FileText,
  Phone,
  Share2,
} from "lucide-react";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";
import { LucideIconByName } from "@/lib/lucide-icons";
import { parseProjectHighlights } from "@/lib/project-portfolio";
import {
  getCachedProjectBySlug,
  getCachedProjectSlugs,
  getCachedSiblingProjects,
  projectCategoryHref,
} from "@/lib/projects";
import { prepareRichHtml, stripHtml } from "@/lib/html";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { getSettingsMap } from "@/lib/settings";

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);
const ProjectFaqAccordion = dynamic(() =>
  import("@/components/site/project/project-faq-accordion").then(
    (mod) => mod.ProjectFaqAccordion,
  ),
);
const ProjectQuoteForm = dynamic(() =>
  import("@/components/site/project/project-quote-form").then(
    (mod) => mod.ProjectQuoteForm,
  ),
);

export const revalidate = 60;

type ProjectDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const rows = await getCachedProjectSlugs().catch(() => []);
  return rows.map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getCachedProjectBySlug(slug).catch(() => null);
  if (!project) return { title: "Proje" };

  const settings = await getSettingsMap().catch(
    () => ({}) as Record<string, string>,
  );
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(project.image, perf.cdnUrl);
  const description =
    project.seoDescription || stripHtml(project.summary) || undefined;

  return {
    title: project.seoTitle || project.title,
    description,
    openGraph: {
      title: project.seoTitle || project.title,
      description,
      images: cover ? [{ url: cover }] : undefined,
    },
  };
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { slug } = await params;

  const [project, settings] = await Promise.all([
    getCachedProjectBySlug(slug).catch(() => null),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);

  if (!project) notFound();

  const siblingProjects = await getCachedSiblingProjects(
    project.categoryId,
  ).catch(() => []);

  const highlights = parseProjectHighlights(project.highlights);
  const phone = settings.contact_phone || "";
  const perf = parsePerformance(settings);
  const cover = withCdnUrl(project.image, perf.cdnUrl);
  const gallery = project.gallery.map((item) => ({
    ...item,
    image: withCdnUrl(item.image, perf.cdnUrl) ?? item.image,
  }));
  const sideImage = gallery[0]?.image ?? null;
  const summaryText = stripHtml(project.summary);
  const brochurePdf = withCdnUrl(project.brochurePdf, perf.cdnUrl);
  const brochureZip = withCdnUrl(project.brochureZip, perf.cdnUrl);
  const content = prepareRichHtml(project.content, {
    lazyImages: perf.lazyImages,
    lazyIframes: perf.lazyIframes,
    disableThirdParty: perf.disableThirdParty,
  });

  if (cover) {
    preload(cover, { as: "image", fetchPriority: "high" });
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-site-border bg-site-surface py-14">
        <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-60" />
        <div className="relative mx-auto grid max-w-7xl px-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12 lg:px-8">
          <div className="lg:col-span-2">
            <nav className="text-sm text-site-muted">
              <SiteLink href="/" className="hover:text-site-primary">
                Ana Sayfa
              </SiteLink>
              <span className="mx-2">›</span>
              <SiteLink href="/projeler" className="hover:text-site-primary">
                Projeler
              </SiteLink>
              {project.category ? (
                <>
                  <span className="mx-2">›</span>
                  <SiteLink
                    href={projectCategoryHref(project.category.slug)}
                    className="hover:text-site-primary"
                  >
                    {project.category.name}
                  </SiteLink>
                </>
              ) : null}
            </nav>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
              {project.title}
            </h1>
          </div>
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
                      <SiteLink
                        href={`/projeler/${item.slug}`}
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                          active
                            ? "bg-site-primary-soft font-semibold text-site-primary"
                            : "text-site-fg hover:bg-site-surface"
                        }`}
                      >
                        <span className="truncate">{item.title}</span>
                        {active ? <ArrowUpRight className="h-4 w-4" /> : null}
                      </SiteLink>
                    </li>
                  );
                })}
              </ul>
            </div>

            {(brochurePdf || brochureZip) && (
              <div className="rounded-3xl border border-site-border bg-site-card p-5 shadow-sm">
                <h3 className="font-display text-lg font-semibold text-site-fg">
                  Proje Dosyaları
                </h3>
                <div className="mt-4 space-y-3">
                  {brochurePdf ? (
                    <a
                      href={brochurePdf}
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
                  {brochureZip ? (
                    <a
                      href={brochureZip}
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
              <SiteLink
                href="/iletisim"
                className="mt-5 inline-flex rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-site-primary"
              >
                Ücretsiz Teklif
              </SiteLink>
            </div>

            <ProjectQuoteForm projectTitle={project.title} />
          </aside>

          <div>
            {cover ? (
              <div className="relative aspect-[16/9] overflow-hidden rounded-[1.75rem] border border-site-border shadow-sm">
                <SiteImage
                  src={cover}
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

            {content.trim() ? (
              <div
                className="site-rich-content mt-8"
                dangerouslySetInnerHTML={{ __html: content }}
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
                  <SiteImage
                    src={sideImage}
                    alt={gallery[0]?.alt || project.title}
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

            {gallery.length > 1 ? (
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {gallery.slice(1).map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-[16/11] overflow-hidden rounded-3xl border border-site-border"
                  >
                    <SiteImage
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

            {perf.disableThirdParty ? null : (
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
            )}
          </div>
        </div>
      </section>

      <HomeCta />
    </>
  );
}
