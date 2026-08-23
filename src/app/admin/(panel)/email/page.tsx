import type { Metadata } from "next";
import { EmailWorkspace } from "@/components/admin/email/email-workspace";
import {
  MAIL_FOLDER_MAP,
  MAIL_LABELS,
  resolveMailFolderKey,
  resolveMailLabelKey,
} from "@/lib/mail";
import {
  ensureDemoMailMessages,
  getMailFolderCounts,
  getMailMessageById,
  listMailMessages,
} from "@/lib/mail-queries";

export const metadata: Metadata = {
  title: "E-posta",
  description: "Gelen kutusu, gönderilenler ve iletişim mesajları",
};

type EmailPageProps = {
  searchParams: Promise<{
    folder?: string;
    label?: string;
    id?: string;
    q?: string;
  }>;
};

export default async function AdminEmailPage({ searchParams }: EmailPageProps) {
  const params = await searchParams;
  await ensureDemoMailMessages();

  const folder = resolveMailFolderKey(params.folder);
  const label = resolveMailLabelKey(params.label);
  const query = (params.q ?? "").trim();
  const selectedId = (params.id ?? "").trim() || null;

  const [messages, counts, selected] = await Promise.all([
    listMailMessages({ folder, label, q: query }),
    getMailFolderCounts(),
    selectedId ? getMailMessageById(selectedId) : Promise.resolve(null),
  ]);

  const labelMeta = label ? MAIL_LABELS.find((item) => item.key === label) : null;
  const folderTitle = labelMeta
    ? labelMeta.label
    : MAIL_FOLDER_MAP[folder].title;

  return (
    <EmailWorkspace
      folder={folder}
      label={label}
      selectedId={selectedId}
      query={query}
      messages={messages}
      selected={selected}
      counts={counts}
      folderTitle={folderTitle}
    />
  );
}
