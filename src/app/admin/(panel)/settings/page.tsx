import type { Metadata } from "next";
import { ensureDefaultSettings, getSettingsMapUncached } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = {
  title: "Genel Ayarlar",
  description: "Site genel ayarlarını yönetin",
};

export default async function SettingsPage() {
  await ensureDefaultSettings();
  const values = await getSettingsMapUncached();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Ayarlar</p>
        <h1 className="mt-1 text-xl font-semibold text-slate-800 sm:text-2xl">Genel Ayarlar</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Site adı, logo, favicon seti, iletişim, SEO, sosyal medya ve e-posta bildirim ayarlarını
          buradan yönetebilirsiniz. Logo ve favicon dosyalarını doğrudan yükleyebilirsiniz.
        </p>
      </div>

      <SettingsForm values={values} scope="general" />
    </div>
  );
}
