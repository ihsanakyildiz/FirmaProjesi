import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CardForm } from "../../card-form";

type EditCardPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditCardPageProps): Promise<Metadata> {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: card ? `Düzenle: ${card.title}` : "Kart Düzenle" };
}

export default async function EditCardPage({ params }: EditCardPageProps) {
  const { id } = await params;
  const card = await prisma.card.findUnique({ where: { id } });
  if (!card) notFound();

  const pages = await prisma.page.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true },
  });

  const pageOptions = pages.map((page) => ({
    id: page.id,
    label: page.title,
    depth: 0,
    href: `/${page.slug}`,
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Kartlar</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Kartı Düzenle</h1>
        <p className="mt-2 text-sm text-slate-500">{card.title}</p>
      </div>
      <CardForm
        mode="edit"
        pageOptions={pageOptions}
        initial={{
          id: card.id,
          title: card.title,
          mediaType: card.mediaType,
          image: card.image,
          icon: card.icon,
          href: card.href,
          sortOrder: card.sortOrder,
          isActive: card.isActive,
        }}
      />
    </div>
  );
}
