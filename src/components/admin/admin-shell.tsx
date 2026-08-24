"use client";

import type { ReactNode } from "react";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { AdminThemeProvider } from "./theme-provider";

type AdminShellProps = {
  children: ReactNode;
  userName: string;
  userEmail: string;
  userRole: string;
  unreadNotificationCount: number;
};

function AdminShellLayout({
  children,
  userName,
  userEmail,
  userRole,
  unreadNotificationCount,
}: AdminShellProps) {
  const { isCollapsed, isDesktop } = useSidebar();
  const iconMode = isDesktop && isCollapsed;

  return (
    <div
      data-admin-shell
      className="admin-shell min-h-screen bg-[#f3f6f9] text-slate-800"
    >
      <AdminSidebar />
      <div
        className={`transition-[padding] duration-300 ease-out ${
          iconMode ? "lg:pl-[72px]" : "lg:pl-[260px]"
        }`}
      >
        <AdminHeader
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          unreadNotificationCount={unreadNotificationCount}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AdminShell(props: AdminShellProps) {
  return (
    <AdminThemeProvider>
      <SidebarProvider>
        <AdminShellLayout {...props} />
      </SidebarProvider>
    </AdminThemeProvider>
  );
}
