import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardList,
  LayoutTemplate,
  LineChart,
  Phone,
  Rocket,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { LucideIconByName } from "@/lib/lucide-icons";

export type ServiceCardItem = {
  title: string;
  description?: string;
  href: string;
  icon?: string | null;
};

const FALLBACK_ICONS: LucideIcon[] = [
  ClipboardList,
  LineChart,
  LayoutTemplate,
  Rocket,
  Wallet,
  Sparkles,
];

const FALLBACK_SERVICES: ServiceCardItem[] = [
  {
    title: "Araştırma & Planlama",
    description: "İhtiyaç analizi ve yol haritası ile projenizi netleştiriyoruz.",
    href: "/hizmetler",
  },
  {
    title: "Strateji Laboratuvarı",
    description: "Marka ve ürün için ölçülebilir dijital stratejiler kuruyoruz.",
    href: "/hizmetler",
  },
  {
    title: "İş Danışmanlığı",
    description: "Süreçlerinizi sadeleştirip büyüme fırsatlarını ortaya çıkarıyoruz.",
    href: "/hizmetler",
  },
  {
    title: "Marka Tanıtımı",
    description: "Görünürlüğünüzü artıran kampanya ve içerik çalışmaları.",
    href: "/hizmetler",
  },
  {
    title: "Finansal Danışmanlık",
    description: "Bütçe ve yatırım kararlarında net, uygulanabilir öneriler.",
    href: "/hizmetler",
  },
  {
    title: "Gelir Artırma",
    description: "Dönüşüm odaklı deneyimler ve yeni gelir kanalları tasarlıyoruz.",
    href: "/hizmetler",
  },
];

export function HomeServices({
  items,
}: {
  items?: ServiceCardItem[];
}) {
  const cards =
    items && items.length > 0
      ? [...items, ...FALLBACK_SERVICES.filter((f) => !items.some((i) => i.title === f.title))].slice(
          0,
          6,
        )
      : FALLBACK_SERVICES;


  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute inset-0 site-soft-glow" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-site-primary-soft px-3 py-1 text-xs font-semibold tracking-wider text-site-primary uppercase">
            ••• Hizmetlerimiz
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
            Hizmet özelliklerimizi{" "}
            <span className="text-site-fg">keşfedin</span>
          </h2>
          <p className="mt-3 text-site-muted">
            Tasarım, yazılım ve dijital büyüme için uçtan uca çözümler.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => {
            const FallbackIcon = FALLBACK_ICONS[index % FALLBACK_ICONS.length];
            return (
              <article
                key={card.title + card.href}
                className="group rounded-3xl border border-site-border bg-site-card p-7 text-center shadow-sm transition hover:-translate-y-1 hover:border-site-primary/40 hover:shadow-xl hover:shadow-violet-500/10"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-site-primary-soft text-site-primary">
                  {card.icon ? (
                    <LucideIconByName name={card.icon} className="h-6 w-6" />
                  ) : (
                    <FallbackIcon className="h-6 w-6" />
                  )}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-site-fg">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-site-muted">
                  {card.description ||
                    "Profesyonel ekibimizle ölçülebilir sonuçlar üreten çözümler sunuyoruz."}
                </p>
                <Link
                  href={card.href}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-site-primary transition group-hover:gap-2"
                >
                  Daha fazla
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/hizmetler"
            className="inline-flex items-center gap-2 rounded-full bg-site-primary px-5 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/25"
          >
            Keşfet
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            href="/iletisim"
            className="inline-flex items-center gap-2 rounded-full border border-site-primary/40 bg-site-card px-5 py-3 text-sm font-semibold text-site-fg"
          >
            <Phone className="h-4 w-4 text-site-primary" />
            Bize Ulaşın
          </Link>
        </div>
      </div>
    </section>
  );
}
