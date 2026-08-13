"use client";

import type { ReactNode } from "react";
import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";
import { SidebarProvider } from "./sidebar-context";
import { AdminThemeProvider } from "./theme-provider";

type AdminShellProps = {
  children: ReactNode;
  userName: string;
  userEmail: string;
  userRole: string;
};

export function AdminShell({
  children,
  userName,
  userEmail,
  userRole,
}: AdminShellProps) {
  return (
    <AdminThemeProvider>
      <SidebarProvider>
        <div
          data-admin-shell
          className="admin-shell min-h-screen bg-[#f3f6f9] text-slate-800"
        >
          <AdminSidebar />
          <div className="lg:pl-[260px]">
            <AdminHeader
              userName={userName}
              userEmail={userEmail}
              userRole={userRole}
            />
            <main className="p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </AdminThemeProvider>
  );
}
