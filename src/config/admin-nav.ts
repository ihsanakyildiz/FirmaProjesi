import {
  BookOpen,
  Briefcase,
  Building2,
  CircleHelp,
  FileText,
  FolderKanban,
  Gauge,
  Globe,
  Images,
  Languages,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  Menu,
  PenLine,
  Settings,
  Sparkles,
  Tags,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  badge?: string;
  children?: AdminNavItem[];
};

export type AdminNavSection = {
  title: string;
  items: AdminNavItem[];
};

export const adminNavSections: AdminNavSection[] = [
  {
    title: "Menü",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
      {
        label: "Sayfalar",
        href: "/admin/pages",
        icon: FileText,
      },
      {
        label: "Hero",
        href: "/admin/heroes",
        icon: Images,
      },
      {
        label: "Kartlar",
        href: "/admin/cards",
        icon: LayoutGrid,
      },
      {
        label: "SSS",
        href: "/admin/faqs",
        icon: CircleHelp,
      },
      {
        label: "Menüler",
        href: "/admin/menus",
        icon: Menu,
      },
    ],
  },
  {
    title: "İçerik",
    items: [
      {
        label: "Yapılan İşler",
        icon: Briefcase,
        children: [
          { label: "Kategoriler", href: "/admin/works/categories", icon: Tags },
          { label: "Çalışmalar", href: "/admin/works", icon: Layers },
        ],
      },
      {
        label: "Projeler",
        icon: FolderKanban,
        children: [
          { label: "Kategoriler", href: "/admin/projects/categories", icon: Tags },
          { label: "Özellikler", href: "/admin/projects/features", icon: Sparkles },
          { label: "Müşteriler", href: "/admin/projects/clients", icon: Building2 },
          { label: "Projeler", href: "/admin/projects", icon: Briefcase },
        ],
      },
      {
        label: "Blog",
        icon: BookOpen,
        children: [
          { label: "Kategoriler", href: "/admin/blog/categories", icon: Tags },
          { label: "Yazılar", href: "/admin/blog/posts", icon: PenLine },
        ],
      },
    ],
  },
  {
    title: "Sistem",
    items: [
      {
        label: "Ayarlar",
        icon: Settings,
        children: [
          {
            label: "Genel Ayarlar",
            href: "/admin/settings",
            icon: Settings,
          },
          {
            label: "Performans",
            href: "/admin/settings/performance",
            icon: Gauge,
          },
          {
            label: "Diller",
            href: "/admin/settings/languages",
            icon: Globe,
          },
          {
            label: "Çeviriler",
            href: "/admin/settings/translations",
            icon: Languages,
          },
        ],
      },
    ],
  },
];

export const adminNavFlatLinks = adminNavSections.flatMap((section) =>
  section.items.flatMap((item) => {
    const childLinks = (item.children ?? [])
      .map((child) => child.href)
      .filter((href): href is string => Boolean(href));

    return [...(item.href ? [item.href] : []), ...childLinks];
  }),
);
