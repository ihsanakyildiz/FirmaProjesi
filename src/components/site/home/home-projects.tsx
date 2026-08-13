"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type ProjectHighlight = {
  title: string;
  summary: string;
  image?: string | null;
  href: string;
};

const FALLBACK_ACCORDION = [
  {
    title: "Özel Yazılım Geliştirme",
    body: "İş süreçlerinize özel, ölçeklenebilir ve güvenli yazılım ürünleri tasarlıyor ve geliştiriyoruz.",
  },
  {
    title: "Kurumsal Web Uygulamaları",
    body: "Yönetim panelleri, müşteri portalları ve entegrasyonlarla uçtan uca web çözümleri üretiyoruz.",
  },
  {
    title: "UI/UX & Marka Deneyimi",
    body: "Kullanıcı odaklı arayüzler ve tutarlı marka diliyle dönüşümü artırıyoruz.",
  },
  {
    title: "Bakım & Destek",
    body: "Yayın sonrası performans, güvenlik ve sürekli iyileştirme desteği sağlıyoruz.",
  },
];

const FALLBACK_PROJECTS: ProjectHighlight[] = [
  {
    title: "E-Ticaret Web Sitesi",
    summary:
      "Temiz arayüz, ödeme entegrasyonu ve gelişmiş arama özellikleriyle tam kapsamlı e-ticaret platformu.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80",
    href: "/projeler",
  },
  {
    title: "Mobil Uygulama Tasarımı",
    summary:
      "Seyahat rezervasyonu için kullanıcı dostu navigasyon ve güçlü görsel dil.",
    image:
      "https://images.unsplash.com/photo-1512941932544-0fddf9f1d9f7?auto=format&fit=crop&w=400&q=80",
    href: "/projeler",
  },
  {
    title: "Portföy Web Sitesi",
    summary:
      "Hızlı, responsive ve minimal bir vitrin deneyimi ile yaratıcı işleri öne çıkarma.",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80",
    href: "/projeler",
  },
];

export function HomeProjects({
  projects,
}: {
  projects?: ProjectHighlight[];
}) {
  const [openIndex, setOpenIndex] = useState(0);
  const list = projects && projects.length > 0 ? projects.slice(0, 3) : FALLBACK_PROJECTS;

  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-site-primary-soft px-3 py-1 text-xs font-semibold tracking-wider text-site-primary uppercase">
            Neden En İyisiyiz
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
            Bizi öne çıkaran{" "}
            <span className="text-site-primary">gurur duyduğumuz projeler</span>
          </h2>
        </div>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="text-6xl font-extrabold tracking-tight text-site-primary sm:text-7xl">
              50k+
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-site-muted">
              Binlerce saatlik tasarım ve geliştirme deneyimiyle markaların dijital
              dönüşümüne eşlik ediyoruz.
            </p>

            <div className="mt-8 space-y-2">
              {FALLBACK_ACCORDION.map((item, index) => {
                const open = openIndex === index;
                return (
                  <div
                    key={item.title}
                    className="overflow-hidden rounded-2xl border border-site-border bg-site-card"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(open ? -1 : index)}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-site-primary text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm font-semibold text-site-fg">
                        {item.title}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-site-muted transition ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    {open ? (
                      <p className="border-t border-site-border px-4 pt-3 pb-4 text-sm leading-relaxed text-site-muted">
                        {item.body}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {list.map((project) => (
              <Link
                key={project.title}
                href={project.href}
                className="group flex gap-4 rounded-3xl border border-site-border bg-site-card p-3 transition hover:border-site-primary/40 hover:shadow-lg"
              >
                <span className="relative h-24 w-28 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-36">
                  <Image
                    src={
                      project.image ||
                      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80"
                    }
                    alt={project.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="140px"
                  />
                </span>
                <span className="min-w-0 py-1 pr-2">
                  <span className="block text-base font-semibold text-site-fg group-hover:text-site-primary">
                    {project.title}
                  </span>
                  <span className="mt-1 line-clamp-3 block text-sm leading-relaxed text-site-muted">
                    {project.summary}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
