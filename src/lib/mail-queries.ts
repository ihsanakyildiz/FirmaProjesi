import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  MAIL_FOLDER_MAP,
  resolveMailFolderKey,
  resolveMailLabelKey,
  toMailListItem,
  type MailFolderKey,
  type MailListItem,
} from "@/lib/mail";

export type MailFolderCounts = Record<MailFolderKey, number> & {
  labels: Record<string, number>;
  unreadInbox: number;
};

function folderWhere(folderKey: MailFolderKey): Prisma.MailMessageWhereInput {
  const meta = MAIL_FOLDER_MAP[folderKey];
  if (meta.starredOnly) {
    return {
      isStarred: true,
      folder: { not: "TRASH" },
    };
  }
  return { folder: meta.folder };
}

export async function getMailFolderCounts(): Promise<MailFolderCounts> {
  const [inbox, sent, starred, draft, spam, trash, unreadInbox, labeled] =
    await Promise.all([
      prisma.mailMessage.count({ where: folderWhere("inbox") }),
      prisma.mailMessage.count({ where: folderWhere("sent") }),
      prisma.mailMessage.count({ where: folderWhere("starred") }),
      prisma.mailMessage.count({ where: folderWhere("draft") }),
      prisma.mailMessage.count({ where: folderWhere("spam") }),
      prisma.mailMessage.count({ where: folderWhere("trash") }),
      prisma.mailMessage.count({
        where: { folder: "INBOX", isRead: false },
      }),
      prisma.mailMessage.groupBy({
        by: ["label"],
        where: { label: { not: null }, folder: { not: "TRASH" } },
        _count: { _all: true },
      }),
    ]);

  const labels: Record<string, number> = {};
  for (const row of labeled) {
    if (row.label) labels[row.label] = row._count._all;
  }

  return {
    inbox,
    sent,
    starred,
    draft,
    spam,
    trash,
    unreadInbox,
    labels,
  };
}

export async function listMailMessages(options: {
  folder?: string | null;
  label?: string | null;
  q?: string | null;
}): Promise<MailListItem[]> {
  const folderKey = resolveMailFolderKey(options.folder);
  const label = resolveMailLabelKey(options.label);
  const q = (options.q ?? "").trim();

  const and: Prisma.MailMessageWhereInput[] = [folderWhere(folderKey)];

  if (label) and.push({ label });
  if (q) {
    and.push({
      OR: [
        { subject: { contains: q } },
        { fromName: { contains: q } },
        { fromEmail: { contains: q } },
        { preview: { contains: q } },
        { bodyText: { contains: q } },
      ],
    });
  }

  const rows = await prisma.mailMessage.findMany({
    where: { AND: and },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });

  return rows.map(toMailListItem);
}

export async function getMailMessageById(id: string) {
  const row = await prisma.mailMessage.findUnique({ where: { id } });
  return row ? toMailListItem(row) : null;
}

/** İlk açılışta boş kalmasın diye örnek iletişim mailleri */
export async function ensureDemoMailMessages() {
  const count = await prisma.mailMessage.count();
  if (count > 0) return;

  const now = Date.now();
  const samples = [
    {
      fromName: "Ayşe Demir",
      fromEmail: "ayse.demir@ornek.com",
      subject: "[İletişim Formu] Web sitesi yenileme teklifi",
      preview:
        "Merhaba, kurumsal web sitemizi yenilemek istiyoruz. Kısa bir görüşme ayarlayabilir miyiz?",
      bodyText:
        "Merhaba,\n\nKurumsal web sitemizi yenilemek istiyoruz. Mevcut sitemiz eski ve mobil uyumlu değil.\n\nSize uygun bir zamanda kısa bir görüşme ayarlayabilir miyiz?\n\nTeşekkürler,\nAyşe Demir",
      label: "contact",
      isRead: false,
      isStarred: true,
      minutesAgo: 35,
    },
    {
      fromName: "Mehmet Kaya",
      fromEmail: "mehmet@teknoloji.co",
      subject: "[İletişim Formu] E-ticaret entegrasyonu",
      preview:
        "Ödeme altyapısı ve stok entegrasyonu için proje kapsamı ve süre hakkında bilgi alabilir miyim?",
      bodyText:
        "Merhaba İhsan Bey,\n\nE-ticaret sitemize ödeme ve stok entegrasyonu eklemek istiyoruz.\nProje kapsamı, süre ve yaklaşık bütçe hakkında bilgi alabilir miyim?\n\nSaygılarımla,\nMehmet Kaya",
      label: "important",
      isRead: false,
      isStarred: false,
      minutesAgo: 120,
    },
    {
      fromName: "Zeynep Arslan",
      fromEmail: "zeynep.arslan@mail.com",
      subject: "[İletişim Formu] SEO ve içerik desteği",
      preview:
        "Blog ve hizmet sayfalarımız için SEO uyumlu içerik üretimi konusunda destek arıyoruz.",
      bodyText:
        "Merhaba,\n\nBlog ve hizmet sayfalarımız için SEO uyumlu içerik üretimi konusunda destek arıyoruz.\nReferanslarınızı inceledim, birlikte çalışmak isteriz.\n\nİyi günler,\nZeynep Arslan",
      label: "updates",
      isRead: true,
      isStarred: false,
      minutesAgo: 60 * 26,
    },
    {
      fromName: "Can Öztürk",
      fromEmail: "can@startup.io",
      subject: "[İletişim Formu] Landing page tasarımı",
      preview:
        "Yeni ürün lansmanı için tek sayfalık bir landing page ve form entegrasyonu istiyoruz.",
      bodyText:
        "Merhaba,\n\nYeni ürün lansmanı için tek sayfalık bir landing page ve form entegrasyonu istiyoruz.\nMümkünse bu hafta içinde dönüş alabilir miyiz?\n\nTeşekkürler,\nCan Öztürk",
      label: "personal",
      isRead: false,
      isStarred: false,
      hasAttachment: true,
      minutesAgo: 60 * 50,
    },
    {
      fromName: "Elif Yıldız",
      fromEmail: "elif@ajans.com",
      subject: "[İletişim Formu] Bakım anlaşması",
      preview:
        "Mevcut sitemiz için aylık bakım ve güvenlik güncellemesi paketi hakkında teklif istiyoruz.",
      bodyText:
        "Merhaba,\n\nMevcut sitemiz için aylık bakım ve güvenlik güncellemesi paketi hakkında teklif istiyoruz.\n\nDetayları paylaşabilirseniz sevinirim.\n\nElif Yıldız",
      label: "private",
      isRead: true,
      isStarred: false,
      minutesAgo: 60 * 80,
    },
  ] as const;

  await prisma.mailMessage.createMany({
    data: samples.map((item) => ({
      folder: "INBOX" as const,
      source: "CONTACT_FORM" as const,
      fromName: item.fromName,
      fromEmail: item.fromEmail,
      toEmail: "admin@ihsanakyildiz.com",
      replyToEmail: item.fromEmail,
      subject: item.subject,
      preview: item.preview,
      bodyText: item.bodyText,
      label: item.label,
      isRead: item.isRead,
      isStarred: item.isStarred,
      hasAttachment: "hasAttachment" in item ? Boolean(item.hasAttachment) : false,
      receivedAt: new Date(now - item.minutesAgo * 60_000),
    })),
  });
}
