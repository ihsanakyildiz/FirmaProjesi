import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { resolvePageSeo } from "@/lib/seo";
import { ClassicPageForm } from "../../classic-page-form";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditPageProps): Promise<Metadata> {
  const { id } = await params;
  const page = await prisma.page.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: page ? `Düzenle: ${page.title}` : "Sayfa Düzenle" };
}

async function loadRelationOptions(selected: {
  workIds: Set<string>;
  projectIds: Set<string>;
  postIds: Set<string>;
}) {
  const [works, projects, posts] = await Promise.all([
    prisma.work.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        isActive: true,
        category: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        isActive: true,
        client: { select: { name: true } },
      },
    }),
    prisma.blogPost.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        isActive: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  return {
    workOptions: works
      .filter((work) => work.isActive || selected.workIds.has(work.id))
      .map((work) => ({
        id: work.id,
        label: work.title,
        isActive: work.isActive,
        meta: work.category?.name ?? null,
      })),
    projectOptions: projects
      .filter((project) => project.isActive || selected.projectIds.has(project.id))
      .map((project) => ({
        id: project.id,
        label: project.title,
        isActive: project.isActive,
        meta: project.client?.name ?? null,
      })),
    postOptions: posts
      .filter((post) => post.isActive || selected.postIds.has(post.id))
      .map((post) => ({
        id: post.id,
        label: post.title,
        isActive: post.isActive,
        meta: post.category?.name ?? null,
      })),
  };
}

export default async function EditPagePage({ params }: EditPageProps) {
  const { id } = await params;
  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      works: { select: { id: true } },
      projects: { select: { id: true } },
      posts: { select: { id: true } },
    },
  });
  if (!page) notFound();

  if (page.type === "ADVANCED") {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
          <Link
            href="/admin/pages"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Sayfalara dön
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-slate-800 sm:text-2xl">
            {page.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">Gelişmiş sayfa</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-8 text-center">
          <LayoutTemplate className="mx-auto h-10 w-10 text-amber-600" />
          <p className="mt-3 text-sm font-medium text-amber-800">
            Gelişmiş sayfa builder henüz hazır değil.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Klasik sayfa özelliği tamamlandıktan sonra bu ekranı geliştireceğiz.
          </p>
        </div>
      </div>
    );
  }

  const options = await loadRelationOptions({
    workIds: new Set(page.works.map((item) => item.id)),
    projectIds: new Set(page.projects.map((item) => item.id)),
    postIds: new Set(page.posts.map((item) => item.id)),
  });

  const autoSeo = resolvePageSeo({
    title: page.title,
    summary: page.summary,
    content: page.content,
  });

  const seoTitle =
    page.seoTitle && page.seoTitle !== autoSeo.seoTitle ? page.seoTitle : "";
  const seoDescription =
    page.seoDescription && page.seoDescription !== autoSeo.seoDescription
      ? page.seoDescription
      : "";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Klasik Sayfa
        </p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">
          Sayfayı Düzenle
        </h1>
        <p className="mt-2 text-sm text-slate-500">{page.title}</p>
      </div>

      <ClassicPageForm
        mode="edit"
        workOptions={options.workOptions}
        projectOptions={options.projectOptions}
        postOptions={options.postOptions}
        initial={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          summary: page.summary ?? "",
          content: page.content ?? "",
          image: page.image ?? "",
          sortOrder: page.sortOrder,
          isActive: page.isActive,
          seoTitle,
          seoDescription,
          workIds: page.works.map((item) => item.id),
          projectIds: page.projects.map((item) => item.id),
          postIds: page.posts.map((item) => item.id),
        }}
      />
    </div>
  );
}
