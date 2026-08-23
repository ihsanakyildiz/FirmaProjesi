"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getMailNotifications,
  getUnreadMailNotificationCount,
  type MailNotificationItem,
} from "@/lib/mail-notifications";

export type MailNotificationsState = {
  items: MailNotificationItem[];
  unreadCount: number;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Oturum bulunamadı.");
  }
  return session;
}

export async function fetchMailNotificationsAction(): Promise<MailNotificationsState> {
  await requireAdmin();

  const [items, unreadCount] = await Promise.all([
    getMailNotifications(8),
    getUnreadMailNotificationCount(),
  ]);

  return { items, unreadCount };
}

export async function fetchUnreadNotificationCountAction(): Promise<number> {
  await requireAdmin();
  return getUnreadMailNotificationCount();
}

export async function markMailNotificationReadAction(id: string) {
  await requireAdmin();
  await prisma.mailMessage.update({
    where: { id },
    data: { isRead: true },
  });
  revalidatePath("/admin/email");
}

export async function markAllMailNotificationsReadAction() {
  await requireAdmin();
  await prisma.mailMessage.updateMany({
    where: { folder: "INBOX", isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/admin/email");
}
