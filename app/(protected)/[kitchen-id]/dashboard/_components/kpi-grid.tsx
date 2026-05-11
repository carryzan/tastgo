'use client'

import { useQuery } from '@tanstack/react-query'
import { BadgePercent, Calculator, Coins, Receipt, Wallet } from 'lucide-react'
import { fetchDashboardKpisBrowser } from '../_lib/client-queries'
import {
  DASHBOARD_KPIS_QUERY_KEY,
  type DashboardKpis,
  formatCompact,
  getLocalRanges,
} from '../_lib/queries'
import { KpiCard } from './kpi-card'

interface KpiGridProps {
  kitchenId: string
}

export function KpiGrid({ kitchenId }: KpiGridProps) {
  const ranges = getLocalRanges()
  const { data } = useQuery<DashboardKpis>({
    queryKey: [...DASHBOARD_KPIS_QUERY_KEY, kitchenId, ranges.dayKey],
    queryFn: () => fetchDashboardKpisBrowser(kitchenId),
  })

  const kpis: DashboardKpis = data ?? {
    orderRevenue: 0,
    kitchenRevenue: 0,
    platformFee: 0,
    orderCount: 0,
    avgOrderValue: 0,
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      <KpiCard
        icon={Receipt}
        label="Orders"
        value={formatCompact(kpis.orderCount)}
        hint="Excl. voids"
      />
      <KpiCard
        icon={Coins}
        label="Order revenue"
        value={formatCompact(kpis.orderRevenue)}
        hint="Gross total"
      />
      <KpiCard
        icon={Wallet}
        label="Kitchen revenue"
        value={formatCompact(kpis.kitchenRevenue)}
        hint="Net revenue"
      />
      <KpiCard
        icon={Calculator}
        label="Avg order value"
        value={formatCompact(kpis.avgOrderValue)}
        hint="Per order"
      />
      <KpiCard
        icon={BadgePercent}
        label="Platform fee"
        value={formatCompact(kpis.platformFee)}
        hint="Fees total"
      />
    </div>
  )
}
