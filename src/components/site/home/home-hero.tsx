import { ArrowUpRight, Rocket, Star } from "lucide-react";
import { SiteImage } from "@/components/site/site-image";
import { SiteLink } from "@/components/site/site-link";

export type HomeHeroProps = {
  siteName: string;
  badgeText?: string | null;
  headline: string;
  headlineAccent?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  trustLabel?: string | null;
  showStars?: boolean;
  starCount?: number;
  showAvatars?: boolean;
  collageImages?: Array<{ src: string; alt: string }>;
  logos?: Array<{ src: string; alt: string; label: string }>;
  backgroundStyle?: string | null;
};

const DEFAULT_COLLAGE = [
  {
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    alt: "Ekip çalışması",
  },
  {
    src: "https://images.unsplash.com/photo-1551434678-e076c223a6922?auto=format&fit=crop&w=800&q=80",
    alt: "Tasarım toplantısı",
  },
  {
    src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=800&q=80",
    alt: "Dijital üretim",
  },
];

const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80",
];

export function HomeHero({
  siteName,
  badgeText = "Ömür Boyu Güncelleme",
  headline,
  headlineAccent,
  subheadline,
  ctaLabel = "Başlayın",
  ctaUrl = "/iletisim",
  trustLabel = "Güvenen markalar",
  showStars = true,
  starCount = 5,
  showAvatars = true,
  collageImages = DEFAULT_COLLAGE,
  logos = [],
  backgroundStyle = "grid",
}: HomeHeroProps) {
  const accent = headlineAccent?.trim();
  const titleParts =
    accent && headline.includes(accent)
      ? {
          before: headline.slice(0, headline.indexOf(accent)),
          accent,
          after: headline.slice(headline.indexOf(accent) + accent.length),
        }
      : { before: headline, accent: "", after: "" };

  const images = collageImages.length ? collageImages : DEFAULT_COLLAGE;

  return (
    <section
      className={`relative overflow-hidden ${
        backgroundStyle === "soft-gradient" ? "site-soft-glow" : ""
      } ${backgroundStyle === "grid" ? "site-grid-bg" : ""}`}
    >
      <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-80" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:py-24">
        <div className="site-animate-fade-up">
          {badgeText ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-site-primary/20 bg-site-primary-soft px-3 py-1.5 text-xs font-semibold tracking-wide text-site-primary uppercase">
              <Rocket className="h-3.5 w-3.5" />
              {badgeText}
            </span>
          ) : null}

          <h1 className="mt-5 font-display text-4xl leading-[1.1] font-extrabold tracking-tight text-site-fg sm:text-5xl lg:text-[3.4rem]">
            <span className="block text-site-primary/90">{siteName}</span>
            <span className="mt-2 block">
              {titleParts.before}
              {titleParts.accent ? (
                <span className="text-site-primary">{titleParts.accent}</span>
              ) : null}
              {titleParts.after}
            </span>
          </h1>

          {subheadline ? (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-site-muted sm:text-lg">
              {subheadline}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SiteLink
              href={ctaUrl || "/iletisim"}
              className="inline-flex items-center gap-2 rounded-full bg-site-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:-translate-y-0.5 hover:brightness-110"
            >
              {ctaLabel}
              <ArrowUpRight className="h-4 w-4" />
            </SiteLink>
            <SiteLink
              href="/projeler"
              className="inline-flex items-center gap-2 rounded-full border border-site-border bg-site-card px-6 py-3.5 text-sm font-semibold text-site-fg transition hover:border-site-primary hover:text-site-primary"
            >
              Projeleri İncele
            </SiteLink>
          </div>

          <div className="mt-10">
            <p className="text-xs font-medium tracking-wide text-site-muted uppercase">
              {trustLabel}
            </p>
            {logos.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-6 opacity-70 grayscale">
                {logos.slice(0, 4).map((logo, index) => (
                  <span
                    key={`${logo.src}-${index}`}
                    className="text-sm font-semibold text-site-fg"
                  >
                    {logo.label && logo.label !== "Logo" ? logo.label : `Marka ${index + 1}`}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-5 text-sm font-semibold text-site-fg/50">
                <span>Acme</span>
                <span>GlobalBank</span>
                <span>Boltshift</span>
                <span>Nietzsche</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative site-animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-violet-500/20 via-fuchsia-400/10 to-emerald-300/20 blur-2xl" />
          <div className="relative grid grid-cols-2 gap-4">
            <div className="site-animate-float relative col-span-2 aspect-[16/10] overflow-hidden rounded-[1.6rem] shadow-xl">
              <SiteImage
                src={images[0]?.src ?? DEFAULT_COLLAGE[0].src}
                alt={images[0]?.alt ?? "Hero"}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 520px"
              />
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] shadow-lg">
              <SiteImage
                src={images[1]?.src ?? DEFAULT_COLLAGE[1].src}
                alt={images[1]?.alt ?? "Hero"}
                fill
                className="object-cover"
                sizes="260px"
              />
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] shadow-lg">
              <SiteImage
                src={images[2]?.src ?? DEFAULT_COLLAGE[2].src}
                alt={images[2]?.alt ?? "Hero"}
                fill
                className="object-cover"
                sizes="260px"
              />
            </div>
          </div>

          {showStars ? (
            <div className="absolute top-6 -right-1 flex rotate-12 gap-1 text-amber-400 sm:right-4">
              {Array.from({ length: Math.min(Math.max(starCount, 1), 5) }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
          ) : null}

          {showAvatars ? (
            <div className="absolute -bottom-3 left-6 flex -space-x-2 rounded-full border border-white/70 bg-white/90 p-1.5 shadow-lg backdrop-blur site-dark:border-slate-700 site-dark:bg-slate-900/90">
              {DEFAULT_AVATARS.map((src) => (
                <span
                  key={src}
                  className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-white site-dark:border-slate-800"
                >
                  <SiteImage src={src} alt="" fill className="object-cover" sizes="36px" />
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
