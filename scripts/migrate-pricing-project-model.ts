import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DELIVERY_NOTE = `<p><strong>Teslimat:</strong> Proje, seçtiğiniz domain ve hostinge (kendi sunucunuz dahil) kurulur; kaynak kodları size teslim edilir. Sosyal medya yönetimi, dijital pazarlama ve e-ticaret danışmanlığı isteğe bağlı devam hizmeti olarak ayrıca sunulabilir.</p>`;

const OPTIONAL_FEATURES = [
  { label: "Sosyal medya yönetimi (isteğe bağlı devam hizmeti)", included: false },
  { label: "Dijital pazarlama / reklam yönetimi (isteğe bağlı)", included: false },
  { label: "E-ticaret danışmanlığı (isteğe bağlı)", included: false },
];

const plans = [
  {
    slug: "baslangic",
    blurb:
      "Kurumsal web sitesi — domain & hostinginize kurulum, kaynak kod teslimi",
    priceMonthly: "₺4.900",
    detailContent: `<p>Başlangıç paketi; dijitalde görünür olmak isteyen küçük işletmeler için tek seferlik proje bedelidir. Web siteniz hazırlanır, sizin belirlediğiniz domain ve hostinge kurulur, kaynak kodları teslim edilir.</p>
<h3>Proje kapsamı</h3>
<ul>
<li>Mobil uyumlu tanıtım / landing sayfası</li>
<li>Temel SEO altyapısı</li>
<li>İletişim formu</li>
<li>Facebook &amp; Instagram hesap kurulumu</li>
<li>Domain &amp; hostinge kurulum</li>
<li>Kaynak kod teslimi</li>
</ul>
${DELIVERY_NOTE}`,
    features: [
      { label: "Kurumsal tanıtım / landing sayfası", included: true },
      { label: "Mobil uyumlu modern tasarım", included: true },
      { label: "Temel SEO altyapısı", included: true },
      { label: "Domain & hostinge kurulum", included: true },
      { label: "Kaynak kod teslimi", included: true },
      { label: "Facebook & Instagram hesap kurulumu", included: true },
      ...OPTIONAL_FEATURES,
    ],
  },
  {
    slug: "profesyonel",
    blurb:
      "Çok sayfalı kurumsal site + admin panel — kurulum ve kaynak kod dahil",
    priceMonthly: "₺9.900",
    detailContent: `<p>Profesyonel paket; yönetilebilir kurumsal web sitesi ihtiyacı olan markalar için tek seferlik proje bedelidir. Admin paneli ile içeriklerinizi kendiniz güncelleyebilirsiniz.</p>
<h3>Proje kapsamı</h3>
<ul>
<li>Çok sayfalı kurumsal web yapısı</li>
<li>Admin paneli</li>
<li>Blog / proje arşivi altyapısı</li>
<li>Domain &amp; hostinge kurulum</li>
<li>Kaynak kod teslimi</li>
</ul>
${DELIVERY_NOTE}`,
    features: [
      { label: "Çok sayfalı kurumsal web sitesi", included: true },
      { label: "Admin paneli", included: true },
      { label: "Blog / proje arşivi", included: true },
      { label: "Mobil uyumlu modern tasarım", included: true },
      { label: "Domain & hostinge kurulum", included: true },
      { label: "Kaynak kod teslimi", included: true },
      ...OPTIONAL_FEATURES,
    ],
  },
  {
    slug: "buyume",
    blurb:
      "Gelişmiş web + dönüşüm odaklı yapı — kurulum, kaynak kod ve reklam altyapısı",
    priceMonthly: "₺14.900",
    featured: true,
    detailContent: `<p>Büyüme paketi; web sitesini büyüme aracına dönüştürmek isteyen markalar için tek seferlik proje bedelidir. Dönüşüm odaklı sayfa yapısı ve reklam entegrasyonlarına hazır altyapı sunar.</p>
<h3>Proje kapsamı</h3>
<ul>
<li>Gelişmiş kurumsal web + admin paneli</li>
<li>Landing / kampanya sayfaları</li>
<li>Meta Pixel &amp; Google Ads dönüşüm altyapısı</li>
<li>Domain &amp; hostinge kurulum</li>
<li>Kaynak kod teslimi</li>
</ul>
${DELIVERY_NOTE}`,
    features: [
      { label: "Gelişmiş kurumsal web + admin paneli", included: true },
      { label: "Landing / kampanya sayfaları", included: true },
      { label: "Meta Pixel & Google Ads altyapısı", included: true },
      { label: "Temel SEO & hız optimizasyonu", included: true },
      { label: "Domain & hostinge kurulum", included: true },
      { label: "Kaynak kod teslimi", included: true },
      ...OPTIONAL_FEATURES,
    ],
  },
  {
    slug: "kurumsal",
    blurb:
      "Özel yazılım ve entegrasyonlar — kurulum, kaynak kod, öncelikli destek",
    priceMonthly: "₺24.900",
    ctaLabel: "Teklif Alın",
    detailContent: `<p>Kurumsal paket; özel ihtiyaçları olan firmalar için tek seferlik proje bedelidir. Kapsam keşif görüşmesi sonrası netleşir; listelenen tutar tipik bir başlangıç bandıdır.</p>
<h3>Proje kapsamı</h3>
<ul>
<li>Özel web uygulaması veya gelişmiş kurumsal site</li>
<li>Üçüncü parti entegrasyonlar (CRM, ERP vb.)</li>
<li>Domain &amp; hostinge kurulum</li>
<li>Kaynak kod teslimi</li>
<li>Proje sonrası öncelikli destek dönemi</li>
</ul>
${DELIVERY_NOTE}`,
    features: [
      { label: "Özel yazılım / gelişmiş web uygulaması", included: true },
      { label: "Üçüncü parti entegrasyonlar", included: true },
      { label: "Admin paneli & rol yönetimi", included: true },
      { label: "Domain & hostinge kurulum", included: true },
      { label: "Kaynak kod teslimi", included: true },
      { label: "Proje sonrası öncelikli destek", included: true },
      ...OPTIONAL_FEATURES,
    ],
  },
  {
    slug: "e-ticaret",
    blurb:
      "Satışa hazır online mağaza — kurulum, kaynak kod ve sipariş paneli",
    priceMonthly: "₺34.900",
    detailContent: `<p>E-Ticaret paketi; ürünlerini online satmak isteyen markalar için tek seferlik proje bedelidir. Mağaza kurulur, sizin domain ve hostinginize yüklenir, kaynak kodları teslim edilir.</p>
<h3>Proje kapsamı</h3>
<ul>
<li>Ürün kataloğu, sepet ve güvenli ödeme</li>
<li>Sipariş yönetim paneli</li>
<li>Domain &amp; hostinge kurulum</li>
<li>Kaynak kod teslimi</li>
</ul>
${DELIVERY_NOTE}`,
    features: [
      { label: "Mobil uyumlu e-ticaret vitrini", included: true },
      { label: "Ürün / stok / sipariş yönetimi", included: true },
      { label: "Güvenli ödeme entegrasyonu", included: true },
      { label: "Domain & hostinge kurulum", included: true },
      { label: "Kaynak kod teslimi", included: true },
      { label: "E-ticaret danışmanlığı (isteğe bağlı devam hizmeti)", included: false },
      { label: "Sosyal medya yönetimi (isteğe bağlı)", included: false },
      { label: "Dijital pazarlama / reklam (isteğe bağlı)", included: false },
    ],
  },
  {
    slug: "saas-platform",
    blurb:
      "Çok dilli, abonelikli özel yazılım — SAAS projeleri için tek seferlik proje",
    priceMonthly: "₺89.900",
    ctaLabel: "Teklif Alın",
    detailContent: `<p>SAAS Platform paketi; kendi yazılım ürününü piyasaya sürmek isteyen firmalar için tek seferlik proje bedelidir. Çok dilli arayüz, üyelik, abonelik ödemeleri ve admin panelleri uçtan uca geliştirilir.</p>
<h3>Proje kapsamı</h3>
<ul>
<li>Çok dilli (i18n) arayüz</li>
<li>Üyelik, rol ve abonelik altyapısı</li>
<li>Müşteri + admin panelleri</li>
<li>Domain &amp; hostinge kurulum</li>
<li>Kaynak kod teslimi</li>
</ul>
${DELIVERY_NOTE}`,
    features: [
      { label: "Çok dilli (i18n) arayüz", included: true },
      { label: "Üyelik & abonelik altyapısı", included: true },
      { label: "Müşteri + admin panelleri", included: true },
      { label: "API & entegrasyon mimarisi", included: true },
      { label: "Domain & hostinge kurulum", included: true },
      { label: "Kaynak kod teslimi", included: true },
      { label: "Sosyal medya yönetimi (isteğe bağlı)", included: false },
      { label: "Dijital pazarlama (isteğe bağlı)", included: false },
    ],
  },
] as const;

async function setProjectPricingMode() {
  for (const [key, label] of [
    ["pricing_billing_monthly_enabled", "Aylık fiyatlandırma (abonelik)"],
    ["pricing_billing_yearly_enabled", "Yıllık fiyatlandırma (abonelik)"],
  ] as const) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: "false" },
      create: {
        key,
        value: "false",
        label,
        type: "boolean",
        group: "pricing_billing",
        sortOrder: key.includes("monthly") ? 0 : 1,
      },
    });
  }
  console.log("Pricing mode: tek seferlik proje (aylık/yıllık kapalı)");
}

async function main() {
  await setProjectPricingMode();

  for (const plan of plans) {
    const existing = await prisma.pricingPlan.findUnique({
      where: { slug: plan.slug },
    });
    if (!existing) {
      console.warn(`Skip (not found): ${plan.slug}`);
      continue;
    }

    const price = plan.priceMonthly;
    await prisma.pricingPlan.update({
      where: { slug: plan.slug },
      data: {
        blurb: plan.blurb,
        detailContent: plan.detailContent,
        priceMonthly: price,
        priceYearly: price,
        priceMonthlyDiscount: null,
        priceYearlyDiscount: null,
        showPeriod: true,
        featured: "featured" in plan ? plan.featured : existing.featured,
        features: JSON.stringify(plan.features),
        ctaLabel: "ctaLabel" in plan ? plan.ctaLabel : existing.ctaLabel,
        purchasable: false,
      },
    });
    console.log(`Updated: ${plan.slug} → ${price} (tek seferlik)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
