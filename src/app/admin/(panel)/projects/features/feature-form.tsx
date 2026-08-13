"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import {
  createProjectFeatureAction,
  updateProjectFeatureAction,
  type ProjectFeatureFormState,
} from "./actions";

const initialState: ProjectFeatureFormState = {};

type FeatureFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
};

type ProjectFeatureFormProps = {
  mode: "create" | "edit";
  initial?: FeatureFormValues;
};

function slugPreview(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProjectFeatureForm({ mode, initial }: ProjectFeatureFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createProjectFeatureAction : updateProjectFeatureAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));

  useEffect(() => {
    if (state.success) {
      router.push("/admin/projects/features");
      router.refresh();
    }
  }, [state.success, router]);

  const inputClass =
    "w-full rounded-md border border-[#e9ebec] bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0ab39c] focus:ring-2 focus:ring-[#0ab39c]/20";

  return (
    <form action={formAction} className="space-y-6">
      {mode === "edit" && initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {state.error ? (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {state.error}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#e9ebec] bg-white shadow-sm">
        <div className="border-b border-[#e9ebec] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">Özellik Bilgileri</h2>
          <p className="mt-1 text-sm text-slate-500">
            Projelerde seçilebilecek teknoloji veya özellik (ör. PHP, React, MySQL)
          </p>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Özellik Adı *
            </label>
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => {
                const next = e.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugPreview(next));
              }}
              placeholder="Örn. PHP, React, WordPress, MySQL"
              className={inputClass}
            />
            {state.fieldErrors?.name ? (
              <p className="mt-1.5 text-xs text-rose-600">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-slate-700">
              Slug (URL)
            </label>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="php"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-slate-400">Boş bırakılırsa addan otomatik üretilir.</p>
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

          <div>
            <label htmlFor="icon" className="mb-1.5 block text-sm font-medium text-slate-700">
              İkon (opsiyonel)
            </label>
            <input
              id="icon"
              name="icon"
              defaultValue={initial?.icon ?? ""}
              placeholder="Örn. code, database, server"
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

          <div className="md:col-span-2">
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">
              Kısa Açıklama
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={initial?.description ?? ""}
              placeholder="Bu özelliğin ne anlama geldiğine dair kısa not (opsiyonel)"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/admin/projects/features"
          className="rounded-md border border-[#e9ebec] bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Vazgeç
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-[#0ab39c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#099885] disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {mode === "create" ? "Kaydet" : "Güncelle"}
        </button>
      </div>
    </form>
  );
}
