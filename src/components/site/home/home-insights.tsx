import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

export type InsightCard = {
  title: string;
  summary: string;
  href: string;
  image?: string | null;
  category?: string;
};

const FALLBACK: InsightCard[] = [
  {
    title: "Açık kaynak projelere katkı neden önemli?",
    summary: "Topluluk, görünürlük ve teknik derinlik için pratik bir rehber.",
    href: "/blog",
    category: "Geliştirme",
    image:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "İlk web geliştirme işinden çıkarılan dersler",
    summary: "Üretim ortamında öğrenilenler ve kaçınılması gereken tuzaklar.",
    href: "/blog",
    category: "Kariyer",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Node.js projelerinde API entegrasyonu",
    summary: "Güvenli, sürdürülebilir entegrasyon kalıpları ve örnekler.",
    href: "/blog",
    category: "Teknik",
    image:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
  },
];

export function HomeInsights({ posts }: { posts?: InsightCard[] }) {
  const items = posts && posts.length > 0 ? posts.slice(0, 3) : FALLBACK;

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-sm font-semibold text-site-primary">Neden biz?</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
              Dünyanın en iyilerine ulaşın
            </h2>
            <p className="mt-2 text-site-muted">
              Müşterilerimizin bizi tercih etmesinin birkaç nedeni.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-site-border text-site-muted"
              aria-label="Önceki"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-site-border text-site-muted"
              aria-label="Sonraki"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((post) => (
            <article
              key={post.title}
              className="group overflow-hidden rounded-3xl border border-site-border bg-site-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative aspect-[16/11] overflow-hidden">
                <Image
                  src={
                    post.image ||
                    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={post.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {post.category ? (
                  <span className="absolute top-4 left-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-site-primary shadow">
                    {post.category}
                  </span>
                ) : null}
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-site-fg group-hover:text-site-primary">
                  {post.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-site-muted">{post.summary}</p>
                <Link
                  href={post.href}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-site-primary"
                >
                  Okumaya devam
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
