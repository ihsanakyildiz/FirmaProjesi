"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { PricingPlanView } from "@/lib/pricing";

const FALLBACK_PLANS: PricingPlanView[] = [
  {
    id: "trial",
    name: "Deneme",
    blurb: "Test ve keşif için",
    priceMonthly: "Ücretsiz",
    priceYearly: "Ücretsiz",
    showPeriod: false,
    featured: false,
    features: [
      { label: "Tek ekip üyesi", included: true },
      { label: "Temel UI blokları", included: true },
      { label: "10 GB depolama", included: true },
      { label: "Özel e-posta hesabı", included: false },
      { label: "Öncelikli destek", included: false },
    ],
    ctaLabel: "Başlayın",
    ctaHref: "/iletisim",
  },
  {
    id: "standard",
    name: "Standart",
    blurb: "Büyüyen ekipler için",
    priceMonthly: "₺14.900",
    priceYearly: "₺149.000",
    showPeriod: true,
    featured: true,
    features: [
      { label: "5 ekip üyesi", included: true },
      { label: "Tüm medya kanalları", included: true },
      { label: "Gelişmiş CRM özellikleri", included: true },
      { label: "15.000 kişiye kadar", included: true },
      { label: "7/24 destek", included: true },
    ],
    ctaLabel: "Başlayın",
    ctaHref: "/iletisim",
  },
  {
    id: "business",
    name: "Kurumsal",
    blurb: "İleri seviye projeler",
    priceMonthly: "₺24.900",
    priceYearly: "₺249.000",
    showPeriod: true,
    featured: false,
    features: [
      { label: "50 ekip üyesi", included: true },
      { label: "Geniş UI kütüphanesi", included: true },
      { label: "100 GB depolama", included: true },
      { label: "Özel e-posta hesabı", included: true },
      { label: "Öncelikli destek", included: true },
    ],
    ctaLabel: "Başlayın",
    ctaHref: "/iletisim",
  },
];

export type HomePricingCta = {
  label?: string | null;
  url?: string | null;
};

export function HomePricing({
  title,
  subtitle,
  plans,
  primaryCta,
  secondaryCta,
}: {
  title?: string | null;
  subtitle?: string | null;
  plans?: PricingPlanView[];
  primaryCta?: HomePricingCta;
  secondaryCta?: HomePricingCta;
} = {}) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const heading =
    title?.trim() || "Şeffaf fiyatlandırma, özel entegrasyonlar";
  const lead = subtitle?.trim() || null;
  const list = plans && plans.length > 0 ? plans : FALLBACK_PLANS;

  const primaryLabel = primaryCta?.label?.trim() || "Ücretsiz Teklif Alın";
  const primaryUrl = primaryCta?.url?.trim() || "/iletisim";
  const secondaryLabel = secondaryCta?.label?.trim() || "Nasıl çalışıyoruz?";
  const secondaryUrl = secondaryCta?.url?.trim() || "/hakkimizda";

  return (
    <section className="relative overflow-hidden py-20">
      <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-50" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
            {heading}
          </h2>
          {lead ? <p className="mt-3 text-site-muted">{lead}</p> : null}
          <div className="mt-6 inline-flex rounded-full border border-site-border bg-site-card p-1">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                billing === "monthly"
                  ? "bg-site-primary text-white"
                  : "text-site-muted hover:text-site-fg"
              }`}
            >
              Aylık
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                billing === "yearly"
                  ? "bg-site-primary text-white"
                  : "text-site-muted hover:text-site-fg"
              }`}
            >
              Yıllık
            </button>
          </div>
        </div>

        <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-3">
          {list.map((plan) => {
            const price =
              billing === "monthly" ? plan.priceMonthly : plan.priceYearly;
            return (
              <article
                key={plan.id}
                className={`rounded-[1.75rem] border p-7 shadow-sm transition ${
                  plan.featured
                    ? "border-transparent bg-site-primary text-white shadow-xl shadow-violet-500/30 lg:-translate-y-3 lg:scale-[1.02]"
                    : "border-site-border bg-site-card text-site-fg"
                }`}
              >
                <h3 className="text-xl font-bold">{plan.name}</h3>
                {plan.blurb ? (
                  <p
                    className={`mt-1 text-sm ${
                      plan.featured ? "text-white/80" : "text-site-muted"
                    }`}
                  >
                    {plan.blurb}
                  </p>
                ) : null}
                <p className="mt-6 text-4xl font-extrabold tracking-tight">
                  {price}
                  {plan.showPeriod ? (
                    <span
                      className={`ml-1 text-sm font-medium ${
                        plan.featured ? "text-white/70" : "text-site-muted"
                      }`}
                    >
                      / {billing === "monthly" ? "ay" : "yıl"}
                    </span>
                  ) : null}
                </p>

                <Link
                  href={plan.ctaHref || "/iletisim"}
                  className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
                    plan.featured
                      ? "bg-white text-site-primary hover:bg-violet-50"
                      : "border border-site-fg/20 text-site-fg hover:border-site-primary hover:text-site-primary"
                  }`}
                >
                  {plan.ctaLabel || "Başlayın"}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.label}
                      className={`flex items-center gap-2.5 text-sm ${
                        feature.included
                          ? plan.featured
                            ? "text-white"
                            : "text-site-fg"
                          : plan.featured
                            ? "text-white/40"
                            : "text-site-muted/50"
                      }`}
                    >
                      <Check
                        className={`h-4 w-4 ${
                          feature.included
                            ? plan.featured
                              ? "text-white"
                              : "text-site-primary"
                            : "opacity-40"
                        }`}
                      />
                      {feature.label}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={primaryUrl}
            className="inline-flex items-center gap-2 rounded-full bg-site-primary px-5 py-3 text-sm font-semibold text-white"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={secondaryUrl}
            className="text-sm font-semibold text-site-fg underline underline-offset-4"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
