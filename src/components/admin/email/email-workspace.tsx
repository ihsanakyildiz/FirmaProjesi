"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Calendar,
  FileText,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Menu,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Reply,
  Search,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import {
  composeMailAction,
  markMailReadAction,
  moveMailToFolderAction,
  replyMailAction,
  toggleMailStarAction,
  type MailActionState,
} from "@/app/admin/(panel)/email/actions";
import {
  MAIL_LABELS,
  avatarTone,
  formatMailDate,
  initialsFromName,
  type MailFolderKey,
  type MailListItem,
} from "@/lib/mail";
import type { MailFolderCounts } from "@/lib/mail-queries";

type EmailWorkspaceProps = {
  folder: MailFolderKey;
  label: string | null;
  selectedId: string | null;
  query: string;
  messages: MailListItem[];
  selected: MailListItem | null;
  counts: MailFolderCounts;
  folderTitle: string;
};

const folderItems: {
  key: MailFolderKey;
  label: string;
  icon: typeof Inbox;
  badgeKey?: keyof MailFolderCounts;
  badgeTone?: "blue" | "red";
}[] = [
  { key: "inbox", label: "Gelen Kutusu", icon: Inbox, badgeKey: "unreadInbox", badgeTone: "blue" },
  { key: "sent", label: "Gönderilenler", icon: Send },
  { key: "starred", label: "Yıldızlı", icon: Star },
  { key: "draft", label: "Taslaklar", icon: FileText, badgeKey: "draft", badgeTone: "red" },
  { key: "spam", label: "Spam", icon: AlertTriangle },
  { key: "trash", label: "Çöp Kutusu", icon: Trash2 },
];

function buildHref(parts: {
  folder?: string;
  label?: string | null;
  id?: string | null;
  q?: string;
}) {
  const params = new URLSearchParams();
  if (parts.folder && parts.folder !== "inbox") params.set("folder", parts.folder);
  if (parts.label) params.set("label", parts.label);
  if (parts.id) params.set("id", parts.id);
  if (parts.q) params.set("q", parts.q);
  const qs = params.toString();
  return qs ? `/admin/email?${qs}` : "/admin/email";
}

function Badge({
  value,
  tone = "blue",
}: {
  value: number;
  tone?: "blue" | "red";
}) {
  if (!value) return null;
  return (
    <span
      className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
        tone === "red"
          ? "bg-[#f06548] text-white"
          : "bg-[#3577f1] text-white"
      }`}
    >
      {value}
    </span>
  );
}

export function EmailWorkspace({
  folder,
  label,
  selectedId,
  query,
  messages,
  selected,
  counts,
  folderTitle,
}: EmailWorkspaceProps) {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState(query);
  const [optimisticMessages, applyOptimistic] = useOptimistic(
    messages,
    (
      current: MailListItem[],
      action: { type: "star"; id: string } | { type: "remove"; id: string },
    ) => {
      if (action.type === "star") {
        return current.map((item) =>
          item.id === action.id ? { ...item, isStarred: !item.isStarred } : item,
        );
      }
      return current.filter((item) => item.id !== action.id);
    },
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    if (selected?.id && !selected.isRead) {
      startTransition(async () => {
        await markMailReadAction(selected.id, true);
      });
    }
  }, [selected?.id, selected?.isRead]);

  const list = useMemo(() => optimisticMessages, [optimisticMessages]);

  const runToggleStar = (id: string) => {
    startTransition(async () => {
      applyOptimistic({ type: "star", id });
      await toggleMailStarAction(id);
      router.refresh();
    });
  };

  const runMove = (id: string, next: "TRASH" | "SPAM" | "INBOX") => {
    startTransition(async () => {
      applyOptimistic({ type: "remove", id });
      await moveMailToFolderAction(id, next);
      router.push(buildHref({ folder, label, q: query }));
      router.refresh();
    });
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    router.push(buildHref({ folder, label, q: search.trim(), id: selectedId }));
  };

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-white">
      {/* Sol klasör paneli */}
      <aside
        className={`absolute inset-y-0 left-0 z-30 flex w-[240px] shrink-0 flex-col border-r border-[#e9ebec] bg-white transition-transform lg:static lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#e9ebec] px-4 py-4">
          <h1 className="text-lg font-semibold text-slate-800">E-posta</h1>
          <button
            type="button"
            className="rounded-md p-1 text-slate-500 lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={() => {
              setComposeOpen(true);
              setNavOpen(false);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#3577f1] px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#2f6ae0]"
          >
            <Plus className="h-4 w-4" />
            Yeni Mesaj
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {folderItems.map((item) => {
            const active = folder === item.key && !label;
            const Icon = item.icon;
            const badgeValue = item.badgeKey ? Number(counts[item.badgeKey] || 0) : 0;
            return (
              <Link
                key={item.key}
                href={buildHref({ folder: item.key })}
                onClick={() => setNavOpen(false)}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-[#3577f1]/10 font-medium text-[#3577f1]"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="truncate">{item.label}</span>
                <Badge value={badgeValue} tone={item.badgeTone} />
              </Link>
            );
          })}

          <div className="mt-5 px-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                Etiketler
              </p>
            </div>
            <div className="space-y-0.5">
              {MAIL_LABELS.map((item) => {
                const active = label === item.key;
                const count = counts.labels[item.key] ?? 0;
                return (
                  <Link
                    key={item.key}
                    href={buildHref({ folder: "inbox", label: item.key })}
                    onClick={() => setNavOpen(false)}
                    className={`flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition ${
                      active
                        ? "bg-slate-100 font-medium text-slate-800"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.label}</span>
                    {count > 0 ? (
                      <span className="ml-auto text-[11px] tabular-nums text-slate-400">
                        {count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      </aside>

      {navOpen ? (
        <button
          type="button"
          className="absolute inset-0 z-20 bg-slate-900/30 lg:hidden"
          aria-label="Menüyü kapat"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      {/* Orta liste */}
      <section className="flex w-full min-w-0 flex-col border-r border-[#e9ebec] md:w-[360px] lg:w-[380px]">
        <div className="flex items-center gap-2 border-b border-[#e9ebec] px-3 py-3">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e9ebec] text-slate-600 lg:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="Klasörler"
          >
            <Menu className="h-4 w-4" />
          </button>
          <h2 className="flex-1 text-base font-semibold text-slate-800">{folderTitle}</h2>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-50"
            aria-label="Diğer"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submitSearch} className="border-b border-[#e9ebec] px-3 py-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ara...."
              className="w-full rounded-md border border-[#e9ebec] bg-[#f8f9fb] py-2.5 pr-3 pl-9 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#3577f1] focus:bg-white focus:ring-2 focus:ring-[#3577f1]/15"
            />
          </label>
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <MailOpen className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-600">Bu klasör boş</p>
              <p className="mt-1 text-xs text-slate-400">
                İletişim formu mesajları burada görünecek.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#eef0f2]">
              {list.map((item) => {
                const active = selectedId === item.id;
                return (
                  <li key={item.id}>
                    <Link
                      href={buildHref({
                        folder,
                        label,
                        q: query,
                        id: item.id,
                      })}
                      className={`block px-3 py-3.5 transition ${
                        active ? "bg-[#3577f1]/08" : "hover:bg-slate-50"
                      } ${!item.isRead ? "bg-[#f7f9fc]" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarTone(
                            item.fromEmail,
                          )}`}
                        >
                          {initialsFromName(item.fromName, item.fromEmail)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p
                              className={`min-w-0 flex-1 truncate text-sm ${
                                item.isRead
                                  ? "font-medium text-slate-700"
                                  : "font-semibold text-slate-900"
                              }`}
                            >
                              {item.fromName}
                            </p>
                            <div className="flex shrink-0 items-center gap-1 text-slate-400">
                              {item.hasAttachment ? (
                                <Paperclip className="h-3.5 w-3.5" />
                              ) : null}
                              <button
                                type="button"
                                className={`rounded p-0.5 ${
                                  item.isStarred
                                    ? "text-[#f7b84b]"
                                    : "hover:text-[#f7b84b]"
                                }`}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  runToggleStar(item.id);
                                }}
                                aria-label="Yıldızla"
                              >
                                <Star
                                  className={`h-3.5 w-3.5 ${
                                    item.isStarred ? "fill-current" : ""
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                          <p
                            className={`mt-0.5 truncate text-sm ${
                              item.isRead
                                ? "text-slate-600"
                                : "font-medium text-slate-800"
                            }`}
                          >
                            {item.subject}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                            {item.preview}
                          </p>
                          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Calendar className="h-3 w-3" />
                            {formatMailDate(item.receivedAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Sağ detay */}
      <section className="hidden min-w-0 flex-1 flex-col bg-[#fbfcfd] md:flex">
        {selected ? (
          <MailDetail
            message={selected}
            pending={pending}
            onTrash={() => runMove(selected.id, "TRASH")}
            onSpam={() => runMove(selected.id, "SPAM")}
            onStar={() => runToggleStar(selected.id)}
            onCompose={() => setComposeOpen(true)}
          />
        ) : (
          <EmptyReadingPane onCompose={() => setComposeOpen(true)} />
        )}
      </section>

      {/* Mobil detay */}
      {selected ? (
        <div className="absolute inset-0 z-40 flex flex-col bg-white md:hidden">
          <div className="flex items-center gap-2 border-b border-[#e9ebec] px-3 py-3">
            <Link
              href={buildHref({ folder, label, q: query })}
              className="rounded-md border border-[#e9ebec] px-3 py-1.5 text-sm text-slate-600"
            >
              Geri
            </Link>
            <p className="truncate text-sm font-medium text-slate-800">{selected.subject}</p>
          </div>
          <MailDetail
            message={selected}
            pending={pending}
            onTrash={() => runMove(selected.id, "TRASH")}
            onSpam={() => runMove(selected.id, "SPAM")}
            onStar={() => runToggleStar(selected.id)}
            onCompose={() => setComposeOpen(true)}
          />
        </div>
      ) : null}

      {composeOpen ? (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          defaultTo={selected?.fromEmail}
        />
      ) : null}
    </div>
  );
}

function EmptyReadingPane({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-white">
          <Mail className="h-10 w-10 text-slate-300" strokeWidth={1.25} />
        </div>
        <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#3577f1]" />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-slate-800">
        Okumak için bir mail seçin
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        Soldaki listeden bir e-posta seçerek içeriğini okuyabilir ve doğrudan
        yanıtlayabilirsiniz.
      </p>
      <button
        type="button"
        onClick={onCompose}
        className="mt-5 inline-flex items-center gap-2 rounded-md border border-[#e9ebec] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <Plus className="h-4 w-4" />
        Yeni Mesaj
      </button>
    </div>
  );
}

function MailDetail({
  message,
  pending,
  onTrash,
  onSpam,
  onStar,
  onCompose,
}: {
  message: MailListItem;
  pending: boolean;
  onTrash: () => void;
  onSpam: () => void;
  onStar: () => void;
  onCompose: () => void;
}) {
  const [replyState, replyAction, replyPending] = useActionState(
    replyMailAction,
    {} as MailActionState,
  );
  const [replyBody, setReplyBody] = useState("");

  useEffect(() => {
    setReplyBody("");
  }, [message.id]);

  useEffect(() => {
    if (replyState.success) setReplyBody("");
  }, [replyState.success]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#e9ebec] bg-white px-4 py-3">
        <button
          type="button"
          onClick={onStar}
          disabled={pending}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#e9ebec] ${
            message.isStarred ? "text-[#f7b84b]" : "text-slate-500"
          }`}
          aria-label="Yıldızla"
        >
          <Star className={`h-4 w-4 ${message.isStarred ? "fill-current" : ""}`} />
        </button>
        <button
          type="button"
          onClick={onSpam}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#e9ebec] px-3 text-sm text-slate-600 hover:bg-slate-50"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Spam
        </button>
        <button
          type="button"
          onClick={onTrash}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#e9ebec] px-3 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Sil
        </button>
        <button
          type="button"
          onClick={onCompose}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-[#3577f1] px-3 text-sm font-medium text-white hover:bg-[#2f6ae0]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Yeni
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarTone(
                message.fromEmail,
              )}`}
            >
              {initialsFromName(message.fromName, message.fromEmail)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-slate-800">{message.fromName}</p>
                  <p className="text-sm text-slate-500">{message.fromEmail}</p>
                </div>
                <p className="text-xs text-slate-400">{formatMailDate(message.receivedAt)}</p>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{message.subject}</h3>
              <p className="mt-1 text-xs text-slate-400">
                Kime: {message.toEmail}
                {message.label ? ` · Etiket: ${message.label}` : ""}
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-[#eef0f2] pt-5">
            {message.bodyHtml ? (
              <div
                className="prose prose-sm max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
                {message.bodyText}
              </pre>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-[#e9ebec] bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Reply className="h-4 w-4 text-[#3577f1]" />
            Yanıtla — {message.fromEmail}
          </div>
          <form action={replyAction} className="space-y-3">
            <input type="hidden" name="parentId" value={message.id} />
            <textarea
              name="body"
              rows={5}
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              placeholder="Yanıtınızı yazın…"
              className="w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#3577f1] focus:ring-2 focus:ring-[#3577f1]/15"
              required
            />
            {replyState.error ? (
              <p className="text-sm text-rose-600" role="alert">
                {replyState.error}
              </p>
            ) : null}
            {replyState.success ? (
              <p className="text-sm text-emerald-600" role="status">
                {replyState.message}
              </p>
            ) : null}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={replyPending}
                className="inline-flex items-center gap-2 rounded-md bg-[#3577f1] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2f6ae0] disabled:opacity-60"
              >
                {replyPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Gönder
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ComposeModal({
  onClose,
  defaultTo,
}: {
  onClose: () => void;
  defaultTo?: string;
}) {
  const [state, action, pending] = useActionState(composeMailAction, {} as MailActionState);
  const fieldClass =
    "w-full rounded-md border border-[#e9ebec] px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#3577f1] focus:ring-2 focus:ring-[#3577f1]/15";

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <ModalShell title="Yeni Mesaj" onClose={onClose}>
      <form action={action} className="space-y-3">
        <Field label="Kime">
          <input
            name="to"
            type="email"
            required
            defaultValue={defaultTo || ""}
            className={fieldClass}
            placeholder="alici@ornek.com"
          />
        </Field>
        <Field label="Konu">
          <input
            name="subject"
            type="text"
            required
            className={fieldClass}
            placeholder="Konu"
          />
        </Field>
        <Field label="Mesaj">
          <textarea
            name="body"
            required
            rows={8}
            className={fieldClass}
            placeholder="Mesajınızı yazın…"
          />
        </Field>
        {state.error ? (
          <p className="text-sm text-rose-600" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="submit"
            name="asDraft"
            value="1"
            disabled={pending}
            className="rounded-md border border-[#e9ebec] px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Taslak
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-[#3577f1] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f6ae0] disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Gönder
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-lg border border-[#e9ebec] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e9ebec] px-4 py-3">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
