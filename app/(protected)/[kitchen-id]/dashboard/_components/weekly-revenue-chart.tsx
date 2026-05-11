'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchWeeklyRevenueBrowser } from '../_lib/client-queries'
import {
  DASHBOARD_WEEKLY_REVENUE_QUERY_KEY,
  type DailyRevenueBucket,
  formatCompact,
  getLocalRanges,
} from '../_lib/queries'

interface WeeklyRevenueChartProps {
  kitchenId: string
}

export function WeeklyRevenueChart({ kitchenId }: WeeklyRevenueChartProps) {
  const ranges = getLocalRanges()
  const { data } = useQuery<DailyRevenueBucket[]>({
    queryKey: [...DASHBOARD_WEEKLY_REVENUE_QUERY_KEY, kitchenId, ranges.dayKey],
    queryFn: () => fetchWeeklyRevenueBrowser(kitchenId),
  })

  const buckets =
    data ?? Array.from({ length: 7 }, (_, dayIndex) => ({ dayIndex, revenue: 0 }))
  const total = buckets.reduce((acc, b) => acc + b.revenue, 0)
  const max = Math.max(...buckets.map((b) => b.revenue), 1)

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 h-full">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Weekly revenue</span>
          <span className="text-sm font-medium">Last 7 days</span>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {formatCompact(total)}
        </span>
      </div>
      <div className="flex items-end gap-1.5 flex-1 min-h-0">
        {buckets.map((bucket) => {
          const fillPct = (bucket.revenue / max) * 100
          return (
            <div
              key={bucket.dayIndex}
              className="relative flex-1 h-full rounded-lg bg-muted overflow-hidden"
              title={formatCompact(bucket.revenue)}
            >
              <div
                className="absolute bottom-0 left-0 right-0 rounded-lg transition-all"
                style={{
                  height: `${fillPct}%`,
                  background: 'var(--chart-2)',
                }}
              />
            </div>
          )
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        Total {formatCompact(total)} in kitchen revenue over the last 7 days.
      </p>
    </div>
  )
}
