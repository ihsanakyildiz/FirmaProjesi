import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageSectionsRenderer } from "@/components/site/page-sections-renderer";
import {
  getAdvancedPageBySlug,
  getClassicPageBySlug,
  resolvePageSections,
} from "@/lib/pages";
import { getSettingsMap } from "@/lib/settings";
import { stripHtml } from "@/lib/html";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "projeler",
  "blog",
  "yapilan-isler",
  "anasayfa",
]);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) return {};

  const [advanced, classic] = await Promise.all([
    getAdvancedPageBySlug(slug).catch(() => null),
    getClassicPageBySlug(slug).catch(() => null),
  ]);
  const page = advanced ?? classic;
  if (!page) return { title: "Sayfa bulunamadı" };

  return {
    title: page.seoTitle || page.title,
    description:
      page.seoDescription ||
      stripHtml(page.summary || page.content || "").slice(0, 160) ||
      undefined,
  };
}

export default async function CmsPage({ params }: PageProps) {
  const { slug } = await params;
  if (RESERVED_SLUGS.has(slug)) notFound();

  const settings = await getSettingsMap().catch(() => ({}) as Record<string, string>);
  const siteName = settings.site_name || "İhsan Akyıldız";

  const advanced = await getAdvancedPageBySlug(slug).catch(() => null);
  if (advanced) {
    const sections = await resolvePageSections(advanced.sections);
    return (
      <PageSectionsRenderer sections={sections} siteName={siteName} />
    );
  }

  const classic = await getClassicPageBySlug(slug).catch(() => null);
  if (!classic) notFound();

  return (
    <article className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-4xl font-bold tracking-tight text-site-fg sm:text-5xl">
          {classic.title}
        </h1>
        {classic.summary ? (
          <div
            className="site-rich-content mt-4 text-lg text-site-muted"
            dangerouslySetInnerHTML={{ __html: classic.summary }}
          />
        ) : null}
        {classic.image ? (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[2rem]">
            <Image
              src={classic.image}
              alt={classic.title}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
            />
          </div>
        ) : null}
        {classic.content ? (
          <div
            className="site-rich-content mt-10"
            dangerouslySetInnerHTML={{ __html: classic.content }}
          />
        ) : null}

        {(classic.projects.length > 0 ||
          classic.works.length > 0 ||
          classic.posts.length > 0) && (
          <div className="mt-16 space-y-10 border-t border-site-border pt-10">
            {classic.projects.length > 0 ? (
              <section>
                <h2 className="text-xl font-semibold text-site-fg">Projeler</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {classic.projects.map((project) => (
                    <li key={project.id}>
                      <Link
                        href={`/projeler/${project.slug}`}
                        className="block rounded-2xl border border-site-border px-4 py-3 transition hover:border-site-primary/40"
                      >
                        {project.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {classic.works.length > 0 ? (
              <section>
                <h2 className="text-xl font-semibold text-site-fg">
                  Yapılan işler
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {classic.works.map((work) => (
                    <li key={work.id}>
                      <Link
                        href={`/yapilan-isler/${work.slug}`}
                        className="block rounded-2xl border border-site-border px-4 py-3 transition hover:border-site-primary/40"
                      >
                        {work.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {classic.posts.length > 0 ? (
              <section>
                <h2 className="text-xl font-semibold text-site-fg">Yazılar</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {classic.posts.map((post) => (
                    <li key={post.id}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="block rounded-2xl border border-site-border px-4 py-3 transition hover:border-site-primary/40"
                      >
                        {post.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
