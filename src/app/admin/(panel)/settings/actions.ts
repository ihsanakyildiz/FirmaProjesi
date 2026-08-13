"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  getSettingDefsByScope,
  getSettingGroupsByScope,
  type SettingFieldDef,
  type SettingsScope,
} from "@/config/settings";
import { prisma } from "@/lib/prisma";
import {
  deletePublicAsset,
  saveOptimizedImage,
  savePublicUpload,
  uploadLimits,
  writeSiteWebManifest,
} from "@/lib/uploads";

export type SettingsFormState = {
  success?: boolean;
  error?: string;
  message?: string;
};

function parseAcceptList(accept?: string) {
  if (!accept) return undefined;
  return accept.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseScope(formData: FormData): SettingsScope {
  const raw = String(formData.get("_settings_scope") ?? "general");
  if (raw === "performance" || raw === "general" || raw === "all") {
    return raw;
  }
  return "general";
}

async function resolveFieldValue(
  def: SettingFieldDef,
  formData: FormData,
  currentValues: Record<string, string>,
) {
  if (def.type === "boolean") {
    return formData.get(def.key) === "on" || formData.get(def.key) === "true" ? "true" : "false";
  }

  if (def.type === "image" || def.type === "file") {
    const previous = (currentValues[def.key] ?? def.defaultValue ?? "").trim();
    const existing = String(formData.get(def.key) ?? "").trim();
    const uploaded = formData.get(`${def.key}_file`);

    if (uploaded instanceof File && uploaded.size > 0) {
      if (def.type === "image") {
        const saved = await saveOptimizedImage(uploaded, {
          uploadDir: def.uploadDir ?? "",
          fixedFileName: def.fixedFileName,
          allowedMime: parseAcceptList(def.accept),
          maxBytes: uploadLimits.image,
          mode: def.imageMode ?? "webp",
          width: def.width,
          height: def.height,
          quality: def.quality,
          previousPath: previous || undefined,
        });
        return saved.publicPath;
      }

      const saved = await savePublicUpload(uploaded, {
        uploadDir: def.uploadDir ?? "",
        fixedFileName: def.fixedFileName,
        allowedMime: parseAcceptList(def.accept),
        maxBytes: uploadLimits.file,
      });

      if (previous && previous !== saved.publicPath) {
        await deletePublicAsset(previous);
      }

      return saved.publicPath;
    }

    if (!existing && previous) {
      await deletePublicAsset(previous);
      return "";
    }

    return existing || previous;
  }

  return String(formData.get(def.key) ?? "").trim();
}

export async function saveSettingsAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Oturum bulunamadı." };
  }

  try {
    const scope = parseScope(formData);
    const groups = getSettingGroupsByScope(scope);
    const defs = getSettingDefsByScope(scope);
    const existingRows = await prisma.setting.findMany();
    const currentValues = Object.fromEntries(existingRows.map((row) => [row.key, row.value]));

    const groupByKey = new Map(
      groups.flatMap((group) =>
        group.fields.map((field, index) => [
          field.key,
          {
            group: group.id,
            sortOrder: index,
            label: field.label,
            type: field.type,
          },
        ]),
      ),
    );

    const nextValues: Record<string, string> = { ...currentValues };

    for (const def of defs) {
      const meta = groupByKey.get(def.key)!;
      const value = await resolveFieldValue(def, formData, currentValues);
      nextValues[def.key] = value;

      await prisma.setting.upsert({
        where: { key: def.key },
        update: {
          value,
          label: meta.label,
          type: meta.type,
          group: meta.group,
          sortOrder: meta.sortOrder,
        },
        create: {
          key: def.key,
          value,
          label: meta.label,
          type: meta.type,
          group: meta.group,
          sortOrder: meta.sortOrder,
        },
      });
    }

    if (scope === "general" || scope === "all") {
      const manifestUpload = formData.get("site_webmanifest_file");
      const hasCustomManifest = manifestUpload instanceof File && manifestUpload.size > 0;

      if (!hasCustomManifest) {
        const manifestPath = await writeSiteWebManifest({
          name: nextValues.site_name || "İhsan Akyıldız",
          shortName: nextValues.site_name || "İhsan Akyıldız",
          description: nextValues.site_description || "",
          icons: [
            {
              src: nextValues.favicon_32 || "/favicon-32x32.png",
              sizes: "32x32",
              type: "image/png",
            },
            {
              src: nextValues.favicon_16 || "/favicon-16x16.png",
              sizes: "16x16",
              type: "image/png",
            },
            {
              src: nextValues.favicon_apple_touch || "/apple-touch-icon.png",
              sizes: "180x180",
              type: "image/png",
            },
          ],
        });

        await prisma.setting.upsert({
          where: { key: "site_webmanifest" },
          update: { value: manifestPath },
          create: {
            key: "site_webmanifest",
            value: manifestPath,
            label: "Web App Manifest",
            type: "file",
            group: "branding",
            sortOrder: 4,
          },
        });
      }
    }

    revalidatePath("/");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/settings/performance");
    return {
      success: true,
      message:
        scope === "performance"
          ? "Performans ayarları kaydedildi."
          : "Ayarlar kaydedildi. Görseller optimize edildi; eski dosyalar temizlendi.",
    };
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Ayarlar kaydedilirken bir hata oluştu.";
    return { error: message };
  }
}
