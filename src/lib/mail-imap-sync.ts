import type { MailInboxConfig } from "@/lib/mail-inbox";
import {
  getImapConfigIssues,
  getMailInboxConfigFromSettings,
  isImapReady,
} from "@/lib/mail-inbox";
import { prisma } from "@/lib/prisma";
import { getSettingsMapUncached } from "@/lib/settings";
import { bumpThreadRootActivity } from "@/lib/mail-thread";

const SYNC_COOLDOWN_MS = 120_000;
const SYNC_TIMEOUT_MS = 8_000;
const MAX_SYNC_MESSAGES = 20;

let lastImapSyncAt = 0;
let syncInFlight: Promise<number> | null = null;

export type ImapSyncResult = {
  imported: number;
  skipped: boolean;
  timedOut?: boolean;
  error?: string;
};

type ParsedIncomingMail = {
  externalId: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  replyToEmail: string | null;
  subject: string;
  preview: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: Date;
  inReplyTo: string | null;
};

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<{ value: T; timedOut: boolean }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ value: fallback, timedOut: true }), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve({ value, timedOut: false });
      })
      .catch(() => {
        clearTimeout(timer);
        resolve({ value: fallback, timedOut: false });
      });
  });
}

function matchesInboxFilter(
  mail: Pick<ParsedIncomingMail, "subject" | "toEmail">,
  inbox: MailInboxConfig,
): boolean {
  const subject = mail.subject;
  const to = mail.toEmail.toLowerCase();

  switch (inbox.filterMode) {
    case "contact_only": {
      const prefix = inbox.contactSubjectPrefix.trim();
      const tag = inbox.subjectFilter.trim();
      return Boolean(
        (prefix && subject.includes(prefix)) ||
          (tag && subject.includes(tag)),
      );
    }
    case "subject_contains":
      return Boolean(
        inbox.subjectFilter.trim() && subject.includes(inbox.subjectFilter.trim()),
      );
    case "to_address": {
      const filter = inbox.toFilter.trim().toLowerCase();
      return Boolean(filter && to.includes(filter));
    }
    case "all":
      return true;
    default: {
      const _exhaustive: never = inbox.filterMode;
      return _exhaustive;
    }
  }
}

function normalizeMessageId(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim().replace(/^<|>$/g, "");
  return raw || null;
}

function hasImapAttachments(
  structure: { disposition?: string; type?: string; childNodes?: unknown[] } | false | undefined,
): boolean {
  if (!structure) return false;
  if (structure.disposition?.toLowerCase() === "attachment") return true;
  if (structure.type && !["text", "multipart"].includes(structure.type.toLowerCase())) {
    return true;
  }
  if (Array.isArray(structure.childNodes)) {
    return structure.childNodes.some((child) =>
      hasImapAttachments(child as { disposition?: string; type?: string; childNodes?: unknown[] }),
    );
  }
  return false;
}

async function resolveParentId(
  mail: Pick<ParsedIncomingMail, "fromEmail" | "subject" | "inReplyTo">,
): Promise<string | null> {
  const inReplyTo = normalizeMessageId(mail.inReplyTo);
  if (inReplyTo) {
    const byExternal = await prisma.mailMessage.findFirst({
      where: { externalId: inReplyTo },
      select: { id: true },
      orderBy: { receivedAt: "desc" },
    });
    if (byExternal) return byExternal.id;
  }

  const baseSubject = mail.subject.replace(/^re:\s*/i, "").trim();
  if (!baseSubject) return null;

  const sent = await prisma.mailMessage.findFirst({
    where: {
      folder: "SENT",
      toEmail: mail.fromEmail,
      subject: { contains: baseSubject.slice(0, 120) },
    },
    select: { id: true },
    orderBy: { receivedAt: "desc" },
  });
  if (sent) return sent.id;

  const thread = await prisma.mailMessage.findFirst({
    where: {
      folder: "INBOX",
      fromEmail: mail.fromEmail,
      subject: { contains: baseSubject.slice(0, 120) },
    },
    select: { id: true },
    orderBy: { receivedAt: "desc" },
  });
  return thread?.id ?? null;
}

function parseFromEnvelope(
  envelope: {
    date?: Date;
    subject?: string;
    from?: { name?: string; address?: string }[];
    to?: { address?: string }[];
    messageId?: string;
    inReplyTo?: string;
  },
  uid: number,
  folder: string,
): ParsedIncomingMail | null {
  const from = envelope.from?.[0];
  const fromEmail = from?.address?.trim();
  if (!fromEmail) return null;

  const fromName =
    (from?.name ?? "").trim() ||
    fromEmail.split("@")[0] ||
    "Bilinmeyen";
  const subject = (envelope.subject ?? "(Konu yok)").trim();
  const toEmail = envelope.to?.[0]?.address ?? "";
  const messageId =
    normalizeMessageId(envelope.messageId ?? null) ??
    `imap:${folder}:${uid}`;

  return {
    externalId: messageId,
    fromName: fromName.slice(0, 191),
    fromEmail: fromEmail.slice(0, 191),
    toEmail: toEmail.slice(0, 191) || "inbox@local",
    replyToEmail: fromEmail.slice(0, 191),
    subject: subject.slice(0, 500),
    preview: subject.slice(0, 500),
    bodyText: "",
    bodyHtml: null,
    receivedAt: envelope.date ?? new Date(),
    inReplyTo: normalizeMessageId(envelope.inReplyTo ?? null),
  };
}

async function importImapMessages(): Promise<{ imported: number }> {
  const settings = await getSettingsMapUncached();
  const inbox = getMailInboxConfigFromSettings(settings);
  const imap = inbox.imap;

  if (!isImapReady(imap) || getImapConfigIssues(imap).length > 0) {
    return { imported: 0 };
  }

  const { ImapFlow } = await import("imapflow");

  const client = new ImapFlow({
    host: imap.host,
    port: imap.port,
    secure: imap.secure,
    auth: {
      user: imap.user,
      pass: imap.password,
    },
    logger: false,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 8_000,
  });

  let imported = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(imap.folder);
    try {
      for await (const message of client.fetch(
        { seen: false },
        { uid: true, envelope: true, bodyStructure: true },
      )) {
        if (imported >= MAX_SYNC_MESSAGES) break;
        if (!message.envelope) continue;

        const parsed = parseFromEnvelope(
          message.envelope,
          message.uid,
          imap.folder,
        );
        if (!parsed) continue;
        if (!matchesInboxFilter(parsed, inbox)) continue;

        const existing = await prisma.mailMessage.findUnique({
          where: { externalId: parsed.externalId },
          select: { id: true },
        });
        if (existing) continue;

        const parentId = await resolveParentId(parsed);
        const isReply =
          Boolean(parentId) || /^re:\s*/i.test(parsed.subject.trim());
        const hasAttachment = hasImapAttachments(message.bodyStructure);

        await prisma.mailMessage.create({
          data: {
            folder: "INBOX",
            source: "IMAP",
            fromName: parsed.fromName,
            fromEmail: parsed.fromEmail,
            toEmail: parsed.toEmail,
            replyToEmail: parsed.replyToEmail,
            subject: parsed.subject,
            preview: parsed.preview,
            bodyText: parsed.preview,
            bodyHtml: null,
            isRead: false,
            isStarred: false,
            hasAttachment,
            label: isReply ? "important" : "contact",
            externalId: parsed.externalId,
            parentId,
            receivedAt: parsed.receivedAt,
          },
        });
        if (parentId) {
          await bumpThreadRootActivity(parentId, {
            preview: parsed.preview,
            receivedAt: parsed.receivedAt,
            isRead: false,
          });
        }
        imported += 1;
      }
    } finally {
      lock.release();
    }
  } catch (error) {
    console.error("[imap-sync]", error);
  } finally {
    try {
      await client.logout();
    } catch {
      // Bağlantı zaten kapalı olabilir
    }
  }

  return { imported };
}

export async function syncImapInboxIfDue(
  force = false,
): Promise<ImapSyncResult> {
  const now = Date.now();
  if (!force && now - lastImapSyncAt < SYNC_COOLDOWN_MS) {
    return { imported: 0, skipped: true };
  }

  if (syncInFlight) {
    const imported = await syncInFlight;
    return { imported, skipped: false };
  }

  const run = async (): Promise<{ imported: number; timedOut?: boolean }> => {
    const { value, timedOut } = await withTimeout(
      importImapMessages(),
      SYNC_TIMEOUT_MS,
      { imported: 0 },
    );
    if (timedOut) {
      console.warn("[imap-sync] Zaman aşımı");
      return { imported: 0, timedOut: true };
    }
    return { imported: value.imported };
  };

  syncInFlight = run()
    .then((result) => result.imported)
    .finally(() => {
      syncInFlight = null;
      lastImapSyncAt = Date.now();
    });

  const imported = await syncInFlight;
  return { imported, skipped: false };
}

export async function syncImapInboxNow(): Promise<ImapSyncResult> {
  return syncImapInboxIfDue(true);
}
