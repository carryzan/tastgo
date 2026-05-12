'use client'

import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, XAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { fetchHourlyOrdersBrowser } from '../_lib/client-queries'
import {
  DASHBOARD_HOURLY_QUERY_KEY,
  type HourlyOrdersBucket,
  getLocalRanges,
} from '../_lib/queries'

interface HourlyOrdersChartProps {
  kitchenId: string
}

const chartConfig = {
  count: {
    label: 'Orders',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

function formatHour(hour: number): string {
  if (hour === 0) return '12a'
  if (hour === 12) return '12p'
  if (hour < 12) return `${hour}a`
  return `${hour - 12}p`
}

export function HourlyOrdersChart({ kitchenId }: HourlyOrdersChartProps) {
  const ranges = getLocalRanges()
  const { data } = useQuery<HourlyOrdersBucket[]>({
    queryKey: [...DASHBOARD_HOURLY_QUERY_KEY, kitchenId, ranges.dayKey],
    queryFn: () => fetchHourlyOrdersBrowser(kitchenId),
  })

  const buckets =
    data ?? Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))

  const peakBucket = buckets.reduce(
    (best, b) => (b.count > best.count ? b : best),
    buckets[0],
  )

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Hourly orders</span>
          <span className="text-sm font-medium">Last 7 days</span>
        </div>
        <span className="text-sm text-muted-foreground">
          Peak {formatHour(peakBucket.hour)} · {peakBucket.count}
        </span>
      </div>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[180px] w-full"
      >
        <BarChart data={buckets} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_, payload) => {
                  const hour = payload?.[0]?.payload?.hour as number | undefined
                  return hour === undefined ? '' : formatHour(hour)
                }}
              />
            }
          />
          <XAxis
            dataKey="hour"
            tickLine={false}
            axisLine={false}
            interval={5}
            tickFormatter={(value: number) => formatHour(value)}
            tick={{ fontSize: 10 }}
          />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
