import Image from "next/image";
import { CheckCircle2, Play } from "lucide-react";

const FEATURES = [
  "BT danışmanlığı için ideal",
  "Yenilikçi yaklaşımlar",
  "Zaman ve maliyet tasarrufu",
  "%100 memnuniyet odaklı",
];

export function HomeWhyUs() {
  return (
    <section className="relative overflow-hidden bg-site-surface py-20">
      <div className="pointer-events-none absolute inset-0 site-soft-glow opacity-70" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full bg-site-primary-soft px-3 py-1 text-xs font-semibold tracking-wider text-site-primary uppercase">
            ••• Neden Biz
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-site-fg sm:text-4xl">
            Büyük ve küçük organizasyonlara{" "}
            <span className="text-site-primary">çözüm</span> üretiyoruz
          </h2>
        </div>

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-3 rounded-[2rem] border-[10px] border-site-primary/25" />
            <div className="relative overflow-hidden rounded-[1.6rem] shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?auto=format&fit=crop&w=900&q=80"
                alt="Profesyonel ekip"
                width={720}
                height={900}
                className="aspect-[4/5] w-full object-cover"
              />
              <button
                type="button"
                className="absolute bottom-5 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-lg"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-site-primary text-white">
                  <Play className="h-3.5 w-3.5 fill-current" />
                </span>
                Video Rehber
              </button>
            </div>
            <span className="absolute -top-2 -right-1 text-2xl text-white drop-shadow">✦</span>
            <span className="absolute -bottom-1 -left-1 text-2xl text-white drop-shadow">✦</span>
          </div>

          <div>
            <h3 className="font-display text-2xl font-bold text-site-fg sm:text-3xl">
              Dijital hayallerinizi gerçeğe dönüştürüyoruz
            </h3>
            <p className="mt-4 text-site-muted">
              Ekibinize üst düzey mentoring, ürün odaklı tasarım ve sürdürülebilir
              yazılım çözümleri sunuyoruz.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-start gap-2.5 text-sm font-medium text-site-fg">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-site-primary" />
                  {feature}
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-site-border pt-8">
              <div className="flex items-center gap-3">
                <span className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-site-primary/30">
                  <Image
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80"
                    alt="Kurucu"
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-site-fg">
                    İhsan Akyıldız
                  </p>
                  <p className="text-xs text-site-muted">Kurucu &amp; Direktör</p>
                </div>
              </div>
              <div className="h-10 w-px bg-site-border" />
              <div>
                <p className="text-3xl font-extrabold text-site-primary">+12</p>
                <p className="text-xs font-medium text-site-muted">Yıllık deneyim</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
