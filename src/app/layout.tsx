import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { DeferredAnalytics } from "@/components/site/deferred-analytics";
import { PerformanceHead } from "@/components/site/performance-head";
import { getSettingsMap, isSettingEnabled } from "@/lib/settings";
import { getWebpCompanion } from "@/lib/uploads";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

function iconEntries(pngPath: string, sizes: string) {
  const webp = getWebpCompanion(pngPath);
  if (webp) {
    return [
      { url: webp, sizes, type: "image/webp" as const },
      { url: pngPath, sizes, type: "image/png" as const },
    ];
  }
  return [{ url: pngPath, sizes, type: "image/png" as const }];
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSettingsMap();
    const siteName = settings.site_name || "İhsan Akyıldız";
    const fav16 = settings.favicon_16 || "/favicon-16x16.png";
    const fav32 = settings.favicon_32 || "/favicon-32x32.png";
    const apple = settings.favicon_apple_touch || "/apple-touch-icon.png";
    const cdn = settings.perf_cdn_url?.replace(/\/$/, "");

    return {
      metadataBase: settings.site_url ? new URL(settings.site_url) : undefined,
      title: {
        default: settings.seo_title || siteName,
        template: `%s | ${siteName}`,
      },
      description:
        settings.seo_description || settings.site_description || "Web tasarım ve yazılım stüdyosu",
      keywords: settings.seo_keywords
        ? settings.seo_keywords.split(",").map((item) => item.trim()).filter(Boolean)
        : undefined,
      icons: {
        icon: [...iconEntries(fav16, "16x16"), ...iconEntries(fav32, "32x32")],
        apple: [{ url: apple, sizes: "180x180", type: "image/png" }],
      },
      manifest: settings.site_webmanifest || "/site.webmanifest",
      openGraph: {
        type: "website",
        locale: "tr_TR",
        siteName,
        title: settings.seo_title || siteName,
        description:
          settings.seo_description || settings.site_description || "Web tasarım ve yazılım stüdyosu",
        images: settings.seo_og_image
          ? [
              {
                url: cdn ? `${cdn}${settings.seo_og_image}` : settings.seo_og_image,
                width: 1200,
                height: 630,
                type: settings.seo_og_image.endsWith(".webp") ? "image/webp" : undefined,
                alt: siteName,
              },
            ]
          : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: settings.seo_title || siteName,
        description:
          settings.seo_description || settings.site_description || "Web tasarım ve yazılım stüdyosu",
        images: settings.seo_og_image
          ? [cdn ? `${cdn}${settings.seo_og_image}` : settings.seo_og_image]
          : undefined,
      },
      robots: settings.seo_robots || "index, follow",
      other: {
        "format-detection": "telephone=no",
      },
    };
  } catch {
    return {
      title: {
        default: "İhsan Akyıldız",
        template: "%s | İhsan Akyıldız",
      },
      description: "Web tasarım ve yazılım stüdyosu",
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let settings: Record<string, string> = {};
  try {
    settings = await getSettingsMap();
  } catch {
    settings = {};
  }

  const smoothScroll = isSettingEnabled(settings, "perf_instant_scroll", false);
  const reduceMotion = isSettingEnabled(settings, "perf_reduce_motion", true);
  const lazyImages = isSettingEnabled(settings, "perf_lazy_images", true);
  const thirdPartyDisabled = isSettingEnabled(settings, "perf_disable_third_party", false);
  const deferAnalytics = isSettingEnabled(settings, "perf_defer_analytics", true);
  const delayMs = Number.parseInt(settings.perf_analytics_delay_ms || "3000", 10);

  const htmlClass = [
    smoothScroll ? "perf-smooth-scroll" : "",
    reduceMotion ? "perf-respect-reduced-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <html
      lang="tr"
      className={htmlClass || undefined}
      data-lazy-images={lazyImages ? "true" : "false"}
      data-lazy-iframes={isSettingEnabled(settings, "perf_lazy_iframes", true) ? "true" : "false"}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var a=localStorage.getItem('admin-theme');if(a==='dark'){document.documentElement.classList.add('admin-dark');document.documentElement.dataset.adminTheme='dark';}else{document.documentElement.dataset.adminTheme='light';}var s=localStorage.getItem('site-theme');if(s==='dark'){document.documentElement.classList.add('site-dark');document.documentElement.dataset.siteTheme='dark';}else{document.documentElement.dataset.siteTheme='light';}}catch(e){}})();`,
          }}
        />
        <PerformanceHead settings={settings} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} antialiased`}
      >        {children}
        <DeferredAnalytics
          enabled={!thirdPartyDisabled}
          defer={deferAnalytics}
          delayMs={Number.isFinite(delayMs) ? delayMs : 3000}
          googleAnalyticsId={settings.google_analytics_id || undefined}
          googleTagManagerId={settings.google_tag_manager_id || undefined}
        />
      </body>
    </html>
  );
}
