import type { SettingGroupDef } from "@/config/settings";

export const pricingSettingGroups: SettingGroupDef[] = [
  {
    id: "pricing_billing",
    title: "Fiyatlandırma dönemi",
    description:
      "Aylık / yıllık fiyat gösterimini ve seçiciyi site genelinde açıp kapatın.",
    fields: [
      {
        key: "pricing_billing_monthly_enabled",
        label: "Aylık fiyatlandırma",
        type: "boolean",
        hint: "Açıksa paketlerde aylık fiyat gösterilir.",
        defaultValue: "true",
      },
      {
        key: "pricing_billing_yearly_enabled",
        label: "Yıllık fiyatlandırma",
        type: "boolean",
        hint: "Açıksa paketlerde yıllık fiyat gösterilir.",
        defaultValue: "true",
      },
    ],
  },
];
