"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "admin-sidebar-mode";
const LEGACY_STORAGE_KEY = "admin-sidebar-collapsed";

/** lg breakpoint — Tailwind lg = 1024px */
export const SIDEBAR_DESKTOP_MIN = 1024;
/** Bu genişliğin altında masaüstünde otomatik ikon modu */
export const SIDEBAR_AUTO_COLLAPSE_MAX = 1280;

export type SidebarMode = "auto" | "expanded" | "collapsed";

type SidebarContextValue = {
  /** Mobil çekmece açık mı */
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  /** lg ve üzeri mi */
  isDesktop: boolean;
  /** Kullanıcı tercihi / otomatik */
  mode: SidebarMode;
  /** Gerçekte uygulanan daraltılmış görünüm (mobilde her zaman false) */
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  setMode: (mode: SidebarMode) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readStoredMode(): SidebarMode {
  if (typeof window === "undefined") return "auto";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "auto" || stored === "expanded" || stored === "collapsed") {
      return stored;
    }

    // Eski anahtar: 0/1
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === "1") return "collapsed";
    if (legacy === "0") return "expanded";
  } catch {
    /* ignore */
  }
  return "auto";
}

function writeStoredMode(mode: SidebarMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function resolveCollapsed(mode: SidebarMode, width: number): boolean {
  if (width < SIDEBAR_DESKTOP_MIN) return false;
  if (mode === "collapsed") return true;
  if (mode === "expanded") return false;
  // auto
  return width < SIDEBAR_AUTO_COLLAPSE_MAX;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setModeState] = useState<SidebarMode>("auto");
  const [viewportWidth, setViewportWidth] = useState(SIDEBAR_DESKTOP_MIN);

  useEffect(() => {
    setModeState(readStoredMode());

    const syncWidth = () => {
      const width = window.innerWidth;
      setViewportWidth(width);
      if (width < SIDEBAR_DESKTOP_MIN) {
        setIsOpen(false);
      }
    };

    syncWidth();
    window.addEventListener("resize", syncWidth);
    return () => window.removeEventListener("resize", syncWidth);
  }, []);

  const isDesktop = viewportWidth >= SIDEBAR_DESKTOP_MIN;
  const isCollapsed = resolveCollapsed(mode, viewportWidth);

  const setMode = useCallback((next: SidebarMode) => {
    setModeState(next);
    writeStoredMode(next);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setModeState((current) => {
      const width = typeof window !== "undefined" ? window.innerWidth : SIDEBAR_DESKTOP_MIN;
      const currentlyCollapsed = resolveCollapsed(current, width);
      const next: SidebarMode = currentlyCollapsed ? "expanded" : "collapsed";
      writeStoredMode(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      toggle: () => setIsOpen((v) => !v),
      close: () => setIsOpen(false),
      isDesktop,
      mode,
      isCollapsed,
      toggleCollapsed,
      setMode,
    }),
    [isOpen, isDesktop, mode, isCollapsed, toggleCollapsed, setMode],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}
