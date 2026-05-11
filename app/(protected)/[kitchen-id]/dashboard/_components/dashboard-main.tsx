'use client'

import { HourlyOrdersChart } from './hourly-orders-chart'
import { KpiGrid } from './kpi-grid'
import { MarketplaceReceivables } from './marketplace-receivables'
import { OfflineRevenueChart } from './offline-revenue-chart'
import { SourceMixDonut } from './source-mix-donut'
import { WeeklyRevenueChart } from './weekly-revenue-chart'

interface DashboardMainProps {
  kitchenId: string
}

export function DashboardMain({ kitchenId }: DashboardMainProps) {
  return (
    <div className="flex flex-col gap-4">
      <KpiGrid kitchenId={kitchenId} />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HourlyOrdersChart kitchenId={kitchenId} />
        </div>
        <MarketplaceReceivables kitchenId={kitchenId} />
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <SourceMixDonut kitchenId={kitchenId} />
        <WeeklyRevenueChart kitchenId={kitchenId} />
        <OfflineRevenueChart kitchenId={kitchenId} />
      </div>
    </div>
  )
}
