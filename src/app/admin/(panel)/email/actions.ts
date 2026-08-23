"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSettingsMapUncached } from "@/lib/settings";
import {
  getSmtpConfigFromSettings,
  isSmtpReady,
  sendMailWithConfig,
} from "@/lib/smtp";

export type MailActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Oturum bulunamadı.");
  }
  return session;
}

function revalidateMail() {
  revalidatePath("/admin/email");
}

export async function markMailReadAction(id: string, isRead = true) {
  await requireAdmin();
  await prisma.mailMessage.update({
    where: { id },
    data: { isRead },
  });
  revalidateMail();
}

export async function toggleMailStarAction(id: string) {
  await requireAdmin();
  const current = await prisma.mailMessage.findUnique({
    where: { id },
    select: { isStarred: true },
  });
  if (!current) throw new Error("Mesaj bulunamadı.");

  await prisma.mailMessage.update({
    where: { id },
    data: { isStarred: !current.isStarred },
  });
  revalidateMail();
}

export async function moveMailToFolderAction(
  id: string,
  folder: "INBOX" | "SPAM" | "TRASH" | "DRAFT",
) {
  await requireAdmin();
  await prisma.mailMessage.update({
    where: { id },
    data: { folder },
  });
  revalidateMail();
}

export async function replyMailAction(
  _prev: MailActionState,
  formData: FormData,
): Promise<MailActionState> {
  try {
    await requireAdmin();

    const parentId = String(formData.get("parentId") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();

    if (!parentId) return { error: "Yanıtlanacak mesaj bulunamadı." };
    if (!body) return { error: "Yanıt metni boş olamaz." };

    const parent = await prisma.mailMessage.findUnique({ where: { id: parentId } });
    if (!parent) return { error: "Orijinal mesaj bulunamadı." };

    const settings = await getSettingsMapUncached();
    const smtp = getSmtpConfigFromSettings(settings);
    const to = parent.replyToEmail || parent.fromEmail;

    if (!isSmtpReady(smtp)) {
      return {
        error:
          "SMTP henüz hazır değil. Ayarlar → E-posta bölümünden SMTP’yi kaydedip test edin.",
      };
    }

    const subject = parent.subject.startsWith("Re:")
      ? parent.subject
      : `Re: ${parent.subject}`;

    await sendMailWithConfig(smtp, {
      to,
      subject,
      text: body,
      replyTo: smtp.replyTo || smtp.fromEmail,
    });

    const preview = body.replace(/\s+/g, " ").slice(0, 180);

    await prisma.$transaction([
      prisma.mailMessage.create({
        data: {
          folder: "SENT",
          source: "COMPOSED",
          fromName: smtp.fromName,
          fromEmail: smtp.fromEmail,
          toEmail: to,
          subject,
          preview,
          bodyText: body,
          isRead: true,
          parentId: parent.id,
          label: parent.label,
          receivedAt: new Date(),
        },
      }),
      prisma.mailMessage.update({
        where: { id: parent.id },
        data: { isRead: true },
      }),
    ]);

    revalidateMail();
    return { success: true, message: "Yanıt gönderildi." };
  } catch (error) {
    console.error("[mail-reply]", error);
    return {
      error: error instanceof Error ? error.message : "Yanıt gönderilemedi.",
    };
  }
}

export async function composeMailAction(
  _prev: MailActionState,
  formData: FormData,
): Promise<MailActionState> {
  try {
    await requireAdmin();

    const to = String(formData.get("to") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const asDraft = String(formData.get("asDraft") ?? "") === "1";

    if (!to) return { error: "Alıcı e-posta gerekli." };
    if (!subject) return { error: "Konu gerekli." };
    if (!body) return { error: "Mesaj metni gerekli." };

    const settings = await getSettingsMapUncached();
    const smtp = getSmtpConfigFromSettings(settings);

    if (asDraft) {
      await prisma.mailMessage.create({
        data: {
          folder: "DRAFT",
          source: "COMPOSED",
          fromName: smtp.fromName || "Admin",
          fromEmail: smtp.fromEmail || smtp.user || "admin@local",
          toEmail: to,
          subject,
          preview: body.replace(/\s+/g, " ").slice(0, 180),
          bodyText: body,
          isRead: true,
          receivedAt: new Date(),
        },
      });
      revalidateMail();
      return { success: true, message: "Taslak kaydedildi." };
    }

    if (!isSmtpReady(smtp)) {
      return {
        error:
          "SMTP henüz hazır değil. Ayarlar → E-posta bölümünden SMTP’yi kaydedip test edin.",
      };
    }

    await sendMailWithConfig(smtp, {
      to,
      subject,
      text: body,
      replyTo: smtp.replyTo || smtp.fromEmail,
    });

    await prisma.mailMessage.create({
      data: {
        folder: "SENT",
        source: "COMPOSED",
        fromName: smtp.fromName,
        fromEmail: smtp.fromEmail,
        toEmail: to,
        subject,
        preview: body.replace(/\s+/g, " ").slice(0, 180),
        bodyText: body,
        isRead: true,
        receivedAt: new Date(),
      },
    });

    revalidateMail();
    return { success: true, message: "Mesaj gönderildi." };
  } catch (error) {
    console.error("[mail-compose]", error);
    return {
      error: error instanceof Error ? error.message : "Mesaj gönderilemedi.",
    };
  }
}
