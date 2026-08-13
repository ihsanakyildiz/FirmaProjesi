import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/html";

export const metadata: Metadata = {
  title: "Yapılan İşler",
  description: "Tamamladığımız çalışmalar ve hizmet örnekleri",
};

export default async function WorksIndexPage() {
  const works = await prisma.work.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      summary: true,
      image: true,
      category: { select: { name: true } },
    },
  });

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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {works.length === 0 ? (
            <p className="py-16 text-center text-sm text-site-muted">
              Henüz yayınlanmış çalışma yok.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {works.map((work) => (
                <Link
                  key={work.id}
                  href={`/yapilan-isler/${work.slug}`}
                  className="group overflow-hidden rounded-3xl border border-site-border bg-site-card shadow-sm transition hover:-translate-y-1 hover:border-site-primary/35 hover:shadow-xl"
                >
                  <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
                    {work.image ? (
                      <Image
                        src={work.image}
                        alt={work.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-100 to-slate-100" />
                    )}
                  </div>
                  <div className="p-5">
                    {work.category?.name ? (
                      <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">
                        {work.category.name}
                      </p>
                    ) : null}
                    <h2 className="mt-1 flex items-start justify-between gap-2 font-display text-lg font-bold text-site-fg group-hover:text-site-primary">
                      <span>{work.title}</span>
                      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 opacity-60" />
                    </h2>
                    {work.summary ? (
                      <p className="mt-2 line-clamp-2 text-sm text-site-muted">
                        {stripHtml(work.summary)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
