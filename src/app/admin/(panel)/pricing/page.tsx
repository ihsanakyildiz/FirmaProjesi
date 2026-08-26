import type { Metadata } from "next";
import Link from "next/link";
import { CircleDollarSign, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPricingBillingOptions } from "@/lib/pricing";
import { ensureDefaultSettings } from "@/lib/settings";
import { PricingBillingSettingsForm } from "./pricing-billing-settings-form";
import { PricingPlansTable } from "./pricing-plans-table";

export const metadata: Metadata = {
  title: "Fiyatlandırma",
  description: "Fiyatlandırma paketlerini yönetin",
};

export default async function PricingAdminPage() {
  await ensureDefaultSettings("pricing").catch(() => undefined);

  const [plans, billing] = await Promise.all([
    prisma.pricingPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        blurb: true,
        priceMonthly: true,
        priceYearly: true,
        featured: true,
        isActive: true,
        sortOrder: true,
      },
    }),
    getPricingBillingOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e9ebec] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
              İçerik
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-800 sm:text-2xl">
              <CircleDollarSign className="h-6 w-6 text-[#405189]" />
              Fiyatlandırma
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Anasayfa ve gelişmiş sayfa fiyatlandırma bölümünde gösterilecek
              paketleri yönetin. Detay sayfası adresi: /paket/[slug]
            </p>
          </div>
          <Link
            href="/admin/pricing/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#0ab39c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#099885]"
          >
            <Plus className="h-4 w-4" />
            Yeni Paket
          </Link>
        </div>
      </div>

      <PricingBillingSettingsForm
        monthlyEnabled={billing.monthlyEnabled}
        yearlyEnabled={billing.yearlyEnabled}
      />

      <PricingPlansTable
        plans={plans.map((plan) => ({
          ...plan,
          slug: plan.slug ?? plan.id,
        }))}
      />
    </div>
  );
}
