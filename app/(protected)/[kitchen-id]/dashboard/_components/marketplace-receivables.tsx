'use client'

import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { fetchMarketplaceReceivablesBrowser } from '../_lib/client-queries'
import {
  DASHBOARD_RECEIVABLES_QUERY_KEY,
  type ReceivableRow,
  formatCompact,
  getLocalRanges,
} from '../_lib/queries'

interface MarketplaceReceivablesProps {
  kitchenId: string
}

export function MarketplaceReceivables({ kitchenId }: MarketplaceReceivablesProps) {
  const ranges = getLocalRanges()
  const { data } = useQuery<ReceivableRow[]>({
    queryKey: [...DASHBOARD_RECEIVABLES_QUERY_KEY, kitchenId, ranges.monthKey],
    queryFn: () => fetchMarketplaceReceivablesBrowser(kitchenId),
  })

  const rows = data ?? []
  const total = rows.reduce((acc, r) => acc + r.unpaidTotal, 0)

  const monthLabel = new Date(ranges.monthStart).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Marketplace receivables</span>
          <span className="text-sm font-medium">{monthLabel}</span>
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {formatCompact(total)}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">
          No outstanding receivables
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.sourceId}
              className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5 gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {row.logoUrl ? (
                  <Image
                    src={row.logoUrl}
                    alt={row.sourceName}
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <span className="h-7 w-7 rounded-lg bg-muted shrink-0" />
                )}
                <span className="text-sm font-medium leading-tight truncate">
                  {row.sourceName}
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
                {formatCompact(row.unpaidTotal)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="text-sm text-muted-foreground">
        Outstanding amounts owed by marketplaces for unpaid orders this month.
      </div>
    </div>
  )
}
