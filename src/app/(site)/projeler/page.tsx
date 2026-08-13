import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/html";

export const metadata: Metadata = {
  title: "Projeler",
  description: "Portföy projelerimizi inceleyin",
};

export default async function ProjectsIndexPage() {
  const projects = await prisma.project.findMany({
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
            Projeler
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-site-muted">
            Tasarım ve yazılım çalışmalarımızdan seçilmiş örnekler.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {projects.length === 0 ? (
            <p className="py-16 text-center text-sm text-site-muted">
              Henüz yayınlanmış proje yok.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projeler/${project.slug}`}
                  className="group overflow-hidden rounded-3xl border border-site-border bg-site-card shadow-sm transition hover:-translate-y-1 hover:border-site-primary/35 hover:shadow-xl"
                >
                  <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
                    {project.image ? (
                      <Image
                        src={project.image}
                        alt={project.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="(max-width:768px) 100vw, 33vw"
                      />
                    ) : null}
                  </div>
                  <div className="p-5">
                    {project.category ? (
                      <p className="text-xs font-semibold tracking-wide text-site-primary uppercase">
                        {project.category.name}
                      </p>
                    ) : null}
                    <h2 className="mt-1 text-lg font-semibold text-site-fg group-hover:text-site-primary">
                      {project.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm text-site-muted">
                      {stripHtml(project.summary) ||
                        "Detaylar için projeyi inceleyin."}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-site-primary">
                      İncele
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
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
