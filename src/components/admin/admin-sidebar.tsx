"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import {
  adminNavFlatLinks,
  adminNavSections,
  type AdminNavItem,
} from "@/config/admin-nav";
import { useSidebar } from "./sidebar-context";

/** Daha spesifik bir nav link eşleşiyorsa kısa prefix (ör. /admin/works) aktif sayılmaz. */
function isNavHrefActive(pathname: string, href: string, allHrefs: string[] = adminNavFlatLinks) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  const matches = pathname === href || pathname.startsWith(`${href}/`);
  if (!matches) return false;

  const hasMoreSpecificMatch = allHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );

  return !hasMoreSpecificMatch;
}

function NavLink({
  item,
  depth = 0,
}: {
  item: AdminNavItem;
  depth?: number;
}) {
  const pathname = usePathname();
  const { close } = useSidebar();
  const hasChildren = !!item.children?.length;
  const isChildActive = item.children?.some(
    (child) => child.href && isNavHrefActive(pathname, child.href),
  );
  const isActive =
    (item.href ? isNavHrefActive(pathname, item.href) : false) || Boolean(isChildActive);

  const [expanded, setExpanded] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) {
      setExpanded(true);
    }
  }, [isChildActive]);

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition ${
            isActive
              ? "bg-white/10 text-white"
              : "text-white/70 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-3">
            <item.icon className="h-[18px] w-[18px] shrink-0 opacity-90" />
            {item.label}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        {expanded ? (
          <div className="mt-1 space-y-0.5 border-l border-white/10 pl-3 ml-5">
            {item.children!.map((child) => (
              <NavLink key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (!item.href) {
    return null;
  }

  const linkActive = isNavHrefActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={close}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
        depth > 0 ? "py-2" : "py-2.5"
      } ${
        linkActive
          ? "bg-[#0ab39c] text-white shadow-sm"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      <item.icon className="h-[17px] w-[17px] shrink-0 opacity-90" />
      <span>{item.label}</span>
      {item.badge ? (
        <span className="ml-auto rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminSidebar() {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={close}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#405189] text-white transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm font-bold tracking-tight">
            IA
          </span>
          <div>
            <p className="text-[15px] font-semibold tracking-wide">İhsan Akyıldız</p>
            <p className="text-[11px] text-white/50">Yönetim Paneli</p>
          </div>
        </div>

        <nav className="admin-scrollbar flex-1 overflow-y-auto px-3 py-4">
          {adminNavSections.map((section) => (
            <div key={section.title} className="mb-5">
              <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink key={item.label} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} İhsan Akyıldız</p>
        </div>
      </aside>
    </>
  );
}
