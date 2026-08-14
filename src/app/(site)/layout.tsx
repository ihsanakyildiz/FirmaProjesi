import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SiteThemeProvider } from "@/components/site/site-theme-provider";
import { ScrollToTop } from "@/components/site/scroll-to-top";
import type { SiteNavItem } from "@/components/site/site-types";
import { getMenuBySlug } from "@/lib/menus";
import { getSettingsMap } from "@/lib/settings";

function fallbackNav(): SiteNavItem[] {
  return [
    {
      label: "Ana Sayfa",
      href: "/",
      children: [
        { label: "Özet", href: "/#hizmetler" },
        { label: "Projeler", href: "/#projeler" },
      ],
    },
    {
      label: "Hakkımızda",
      href: "/hakkimizda",
      children: [
        { label: "Ekip", href: "/hakkimizda" },
        { label: "Kariyer", href: "/kariyer" },
      ],
    },
    {
      label: "Sayfalar",
      href: "/hizmetler",
      children: [
        { label: "Hizmetler", href: "/hizmetler" },
        { label: "Yapılan İşler", href: "/yapilan-isler" },
        { label: "İş Kategorileri", href: "/yapilan-isler/kategori" },
        { label: "Projeler", href: "/projeler" },
        { label: "Proje Kategorileri", href: "/projeler/kategori" },
        { label: "SSS", href: "/#sss" },
        { label: "Fiyatlandırma", href: "/#fiyatlandirma" },
      ],
    },
    {
      label: "Blog",
      href: "/blog",
      children: [
        { label: "Tüm Yazılar", href: "/blog" },
        { label: "Kategoriler", href: "/blog/kategori" },
      ],
    },
    { label: "İletişim", href: "/iletisim" },
  ];
}

async function resolveNav(): Promise<SiteNavItem[]> {
  try {
    const menu = await getMenuBySlug("header-menu");
    if (!menu?.items?.length) return fallbackNav();

    return menu.items.map((item) => ({
      label: item.label,
      href: item.hrefResolved || item.href || "#",
      children: item.children?.map((child) => ({
        label: child.label,
        href: child.hrefResolved || child.href || "#",
      })),
    }));
  } catch {
    return fallbackNav();
  }
}

async function resolveFooterNav(): Promise<SiteNavItem[]> {
  try {
    const menu = await getMenuBySlug("footer-menu");
    if (!menu?.items?.length) {
      return [
        { label: "Ana Sayfa", href: "/" },
        { label: "Hizmetler", href: "/hizmetler" },
        { label: "Projeler", href: "/projeler" },
        { label: "Blog", href: "/blog" },
        { label: "İletişim", href: "/iletisim" },
      ];
    }
    return menu.items.map((item) => ({
      label: item.label,
      href: item.hrefResolved || item.href || "#",
    }));
  } catch {
    return [{ label: "Ana Sayfa", href: "/" }];
  }
}

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, headerItems, footerItems] = await Promise.all([
    getSettingsMap().catch(() => ({}) as Record<string, string>),
    resolveNav(),
    resolveFooterNav(),
  ]);

  const siteName = settings.site_name || "İhsan Akyıldız";

  return (
    <SiteThemeProvider>
      <div className="site-shell min-h-screen">
        <SiteHeader
          siteName={siteName}
          phone={settings.contact_phone}
          email={settings.contact_email}
          address={settings.contact_address}
          hours={settings.contact_working_hours || "Pzt–Cum: 10:00 – 19:00"}
          ctaLabel="Teklif Alın"
          ctaHref="/iletisim"
          items={headerItems}
        />
        <main>{children}</main>
        <SiteFooter
          siteName={siteName}
          description={
            settings.site_description ||
            "Web tasarım, yazılım ve dijital çözümlerle markanızı büyütüyoruz."
          }
          phone={settings.contact_phone}
          email={settings.contact_email}
          address={settings.contact_address}
          items={footerItems}
        />
        <ScrollToTop />
      </div>
    </SiteThemeProvider>
  );
}
