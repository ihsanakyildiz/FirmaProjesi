import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

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
