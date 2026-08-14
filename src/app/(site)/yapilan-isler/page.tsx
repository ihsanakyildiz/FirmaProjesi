import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { WorkCard } from "@/components/site/work/work-card";
import { WorkCategorySidebar } from "@/components/site/work/work-category-sidebar";
import { SitePagination } from "@/components/site/site-pagination";
import { parsePerformance, withCdnUrl } from "@/lib/performance";
import { getSettingsMap } from "@/lib/settings";
import {
  WORK_GRID_PAGE_SIZE,
  getCachedWorkCategoryIndex,
  getCachedWorkListing,
} from "@/lib/works";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Yapılan İşler",
  description: "Tamamladığımız çalışmalar ve hizmet örnekleri",
};

const HomeCta = dynamic(() =>
  import("@/components/site/home/home-cta").then((mod) => mod.HomeCta),
);

type WorksIndexPageProps = {
  searchParams: Promise<{ sayfa?: string }>;
};

function pageHref(page: number) {
  return page <= 1 ? "/yapilan-isler" : `/yapilan-isler?sayfa=${page}`;
}

export default async function WorksIndexPage({
  searchParams,
}: WorksIndexPageProps) {
  const query = await searchParams;
  const requestedPage = Number.parseInt(query.sayfa ?? "1", 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [works, categories, settings] = await Promise.all([
    getCachedWorkListing().catch(() => []),
    getCachedWorkCategoryIndex().catch(() => []),
    getSettingsMap().catch(() => ({}) as Record<string, string>),
  ]);
  const perf = parsePerformance(settings);

  const totalPages = Math.max(1, Math.ceil(works.length / WORK_GRID_PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const gridWorks = works.slice(
    (page - 1) * WORK_GRID_PAGE_SIZE,
    page * WORK_GRID_PAGE_SIZE,
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-site-border bg-site-surface py-14">
        <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex rounded-full bg-site-primary-soft px-3 py-1 text-xs font-semibold tracking-wider text-site-primary uppercase">
            Portföy
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-5xl">
            Yapılan İşler
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-site-muted">
            Tasarım ve yazılım çalışmalarımızdan seçilmiş örnekler.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12 lg:px-8">
          <WorkCategorySidebar categories={categories} />
          <div className="min-w-0">
            {gridWorks.length === 0 ? (
              <p className="py-10 text-sm text-site-muted">
                Henüz yayınlanmış çalışma yok.
              </p>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2">
                  {gridWorks.map((work, index) => (
                    <WorkCard
                      key={work.id}
                      work={{
                        ...work,
                        image: withCdnUrl(work.image, perf.cdnUrl),
                      }}
                      imagePriority={index === 0}
                    />
                  ))}
                </div>
                <SitePagination
                  currentPage={page}
                  totalPages={totalPages}
                  hrefForPage={pageHref}
                />
              </>
            )}
          </div>
        </div>
      </section>

      <HomeCta />
    </>
  );
}
