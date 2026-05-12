'use client'

import { useQuery } from '@tanstack/react-query'
import { Cell, Pie, PieChart } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { fetchSourceMixBrowser } from '../_lib/client-queries'
import {
  CHART_PALETTE,
  DASHBOARD_SOURCE_MIX_QUERY_KEY,
  type SourceMixSlice,
  formatCompact,
  getLocalRanges,
} from '../_lib/queries'

interface SourceMixDonutProps {
  kitchenId: string
}

export function SourceMixDonut({ kitchenId }: SourceMixDonutProps) {
  const ranges = getLocalRanges()
  const { data } = useQuery<SourceMixSlice[]>({
    queryKey: [...DASHBOARD_SOURCE_MIX_QUERY_KEY, kitchenId, ranges.dayKey],
    queryFn: () => fetchSourceMixBrowser(kitchenId),
  })

  const slices = data ?? []
  const totalCount = slices.reduce((acc, s) => acc + s.count, 0)

  const chartConfig: ChartConfig = { count: { label: 'Orders' } }
  slices.forEach((slice, idx) => {
    chartConfig[slice.sourceId] = {
      label: slice.sourceName,
      color: CHART_PALETTE[idx % CHART_PALETTE.length],
    }
  })

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">Orders by source</span>
        <span className="text-sm font-medium">Today</span>
      </div>
      {totalCount === 0 ? (
        <div className="text-sm text-muted-foreground py-10 text-center">
          No orders yet today
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <ChartContainer
            config={chartConfig}
            className="aspect-square h-[180px] w-[180px]"
          >
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent hideLabel nameKey="sourceName" />}
              />
              <Pie
                data={slices}
                dataKey="count"
                nameKey="sourceName"
                innerRadius={56}
                outerRadius={82}
                strokeWidth={2}
                stroke="var(--card)"
              >
                {slices.map((slice, idx) => (
                  <Cell
                    key={slice.sourceId}
                    fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            {slices.map((slice, idx) => {
              return (
                <li
                  key={slice.sourceId}
                  className="flex items-center gap-2"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      background: CHART_PALETTE[idx % CHART_PALETTE.length],
                    }}
                  />
                  <span className="text-sm">{slice.sourceName}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      <div className="text-sm text-muted-foreground">
        Total {formatCompact(totalCount)} orders today across all sources.
      </div>
    </div>
  )
}
