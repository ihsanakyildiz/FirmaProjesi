"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react";
import { LucideIconPicker } from "@/components/admin/lucide-icon-picker";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  createCardAction,
  updateCardAction,
  type CardFormState,
} from "./actions";

const initialState: CardFormState = {};

type PageOption = {
  id: string;
  label: string;
  depth: number;
  href: string;
};

type CardFormValues = {
  id?: string;
  title?: string;
  mediaType?: "IMAGE" | "ICON";
  image?: string | null;
  icon?: string | null;
  href?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export function CardForm({
  mode,
  initial,
  pageOptions = [],
}: {
  mode: "create" | "edit";
  initial?: CardFormValues;
  pageOptions?: PageOption[];
}) {
  const router = useRouter();
  const action = mode === "create" ? createCardAction : updateCardAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [mediaType, setMediaType] = useState<"IMAGE" | "ICON">(
    initial?.mediaType ?? "ICON",
  );
  const [icon, setIcon] = useState(initial?.icon ?? "LayoutGrid");
  const [href, setHref] = useState(initial?.href ?? "");
  const [pageId, setPageId] = useState("");
  const [image, setImage] = useState(initial?.image ?? "");
  const [preview, setPreview] = useState(initial?.image ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) {
      router.push("/admin/cards");
      router.refresh();
    }
  }, [state.success, router]);

  const selectOptions = useMemo(
    () =>
      pageOptions.map((page) => ({
        id: page.id,
        label: page.label,
        depth: page.depth,
      })),
    [pageOptions],
  );

  const onPageChange = (id: string) => {
    setPageId(id);
    const selected = pageOptions.find((page) => page.id === id);
    if (selected) setHref(selected.href);
  };

  const submitAction = (formData: FormData) => {
    formData.delete("image_file");
    if (imageFile) formData.append("image_file", imageFile);
    formAction(formData);
  };

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={submitAction} className="space-y-6">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="image" value={image} />
      <input type="hidden" name="mediaType" value={mediaType} />

      {state.error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Kart Bilgileri</h2>
          <p className="mt-1 text-sm text-slate-500">
            Başlık, görsel veya ikon ve tıklanınca açılacak sayfa
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-slate-700">
              Kart başlığı *
            </label>
            <input
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn. Web Tasarım"
              className={inputClass}
            />
            {state.fieldErrors?.title ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.title}</p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <p className="mb-1.5 text-sm font-medium text-slate-700">Görsel kaynağı *</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMediaType("ICON")}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                  mediaType === "ICON"
                    ? "border-[#0ab39c] bg-[#0ab39c]/10 text-[#0ab39c]"
                    : "border-[#e9ebec] text-slate-600 hover:bg-slate-50"
                }`}
              >
                Ücretsiz ikon (Lucide)
              </button>
              <button
                type="button"
                onClick={() => setMediaType("IMAGE")}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                  mediaType === "IMAGE"
                    ? "border-[#0ab39c] bg-[#0ab39c]/10 text-[#0ab39c]"
                    : "border-[#e9ebec] text-slate-600 hover:bg-slate-50"
                }`}
              >
                Görsel yükle
              </button>
            </div>
          </div>

          {mediaType === "ICON" ? (
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-700">İkon seçimi</p>
              <LucideIconPicker value={icon} onChange={setIcon} />
              {state.fieldErrors?.icon ? (
                <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.icon}</p>
              ) : null}
            </div>
          ) : (
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-700">Kart görseli</p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#e9ebec] bg-[#f3f6f9]">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-md border border-[#e9ebec] px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Upload className="h-4 w-4" />
                      Görsel Seç
                    </button>
                    {preview ? (
                      <button
                        type="button"
                        onClick={() => {
                          setImage("");
                          setPreview("");
                          setImageFile(null);
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Kaldır
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setImageFile(file);
                      setPreview(URL.createObjectURL(file));
                    }}
                  />
                  <p className="text-xs text-slate-400">PNG, JPG veya WEBP</p>
                  {state.fieldErrors?.image ? (
                    <p className="text-xs text-rose-600">{state.fieldErrors.image}</p>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <label htmlFor="pagePick" className="mb-1.5 block text-sm font-medium text-slate-700">
              CMS sayfasından seç (opsiyonel)
            </label>
            <SearchableSelect
              id="pagePick"
              name="pagePick"
              value={pageId}
              onChange={onPageChange}
              options={selectOptions}
              placeholder="Sayfa ara veya seçin…"
              emptyLabel="— Elle link yazacağım —"
              searchPlaceholder="Sayfa ara…"
              noResultsLabel="Eşleşen sayfa yok"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Seçerseniz aşağıdaki link otomatik doldurulur; istediğiniz gibi düzenleyebilirsiniz.
            </p>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="href" className="mb-1.5 block text-sm font-medium text-slate-700">
              Açılacak sayfa linki *
            </label>
            <input
              id="href"
              name="href"
              required
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="/hakkimizda veya https://..."
              className={inputClass}
            />
            {state.fieldErrors?.href ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.href}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="sortOrder" className="mb-1.5 block text-sm font-medium text-slate-700">
              Sıra
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={
                mode === "create" && initial?.sortOrder === undefined
                  ? ""
                  : (initial?.sortOrder ?? 0)
              }
              placeholder="Boş = otomatik"
              className={inputClass}
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-md border border-[#e9ebec] px-4 py-2.5">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={initial?.isActive ?? true}
                className="h-4 w-4 rounded border-slate-300 text-[#0ab39c] focus:ring-[#0ab39c]"
              />
              <span className="text-sm font-medium text-slate-700">Aktif</span>
            </label>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/cards"
          className="rounded-md border border-[#e9ebec] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Listeye Dön
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Kartı Kaydet" : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </form>
  );
}
