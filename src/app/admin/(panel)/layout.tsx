import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/admin-session";

export default async function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAdminSession();

  if (!session?.user) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      userName={session.user.name ?? "Admin"}
      userEmail={session.user.email ?? ""}
      userRole={session.user.role}
    >
      {children}
    </AdminShell>
  );
}
