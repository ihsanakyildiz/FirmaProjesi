import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getAllSettingDefs,
  getSettingGroupsByScope,
  type SettingsScope,
} from "@/config/settings";

export async function getSettingsMapUncached(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = {};

  for (const def of getAllSettingDefs()) {
    map[def.key] = def.defaultValue ?? "";
  }

  for (const row of rows) {
    map[row.key] = row.value;
  }

  return map;
}

export const getSettingsMap = unstable_cache(
  async () => getSettingsMapUncached(),
  ["settings-map"],
  { tags: ["settings"], revalidate: 60 },
);

export async function ensureDefaultSettings(scope: SettingsScope = "all") {
  const existing = await prisma.setting.findMany({ select: { key: true } });
  const existingKeys = new Set(existing.map((row) => row.key));
  const groups = getSettingGroupsByScope(scope);
  const defs = groups.flatMap((group) => group.fields);

  const missing = defs.filter((def) => !existingKeys.has(def.key));
  if (missing.length === 0) {
    return;
  }

  const groupByKey = new Map(
    groups.flatMap((group) =>
      group.fields.map((field, index) => [
        field.key,
        { group: group.id, sortOrder: index, label: field.label, type: field.type },
      ]),
    ),
  );

  await prisma.setting.createMany({
    data: missing.map((def) => {
      const meta = groupByKey.get(def.key)!;
      return {
        key: def.key,
        value: def.defaultValue ?? "",
        label: meta.label,
        type: meta.type,
        group: meta.group,
        sortOrder: meta.sortOrder,
      };
    }),
    skipDuplicates: true,
  });
}

export function parseDomainList(value?: string) {
  if (!value) return [];
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item))
    .map((item) => item.replace(/\/$/, ""));
}

export function isSettingEnabled(map: Record<string, string>, key: string, fallback = false) {
  const value = map[key];
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1" || value === "on";
}
