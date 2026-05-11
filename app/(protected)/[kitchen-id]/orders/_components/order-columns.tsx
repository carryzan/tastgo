'use client'

import type { ColumnDef, Row } from '@tanstack/react-table'
import { EyeIcon } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig } from '@/lib/types/data-table'
import type { OrderRow } from '@/lib/types/orders'
import {
  formatAmount,
  formatDateTime,
  kitchenStatusLabel,
  paymentStatusLabel,
  settlementModeLabel,
} from '@/lib/order-format'

export const orderColumnConfigs: ColumnConfig[] = [
  { column: 'order_number', label: 'Order #', type: 'number', sortable: true },
  { column: 'source_order_code', label: 'Source Code', type: 'text' },
  { column: 'brands.name', label: 'Brand', type: 'text', sortable: true },
  { column: 'sources.name', label: 'Source', type: 'text', sortable: true },
  {
    column: 'sources.settlement_mode',
    label: 'Settlement',
    type: 'select',
    options: ['cash_now', 'marketplace_receivable'],
  },
  {
    column: 'kitchen_status',
    label: 'Kitchen Status',
    type: 'select',
    options: ['preparing', 'ready', 'completed'],
  },
  {
    column: 'payment_status',
    label: 'Payment Status',
    type: 'select',
    options: ['unpaid', 'paid'],
  },
  { column: 'net_amount', label: 'Net', type: 'number', sortable: true },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

function LogoCell({
  name,
  logoUrl,
}: {
  name: string | null | undefined
  logoUrl?: string | null
}) {
  const display = name?.trim() ? name : '-'
  const initials =
    display !== '-' ? display.slice(0, 2).toUpperCase() : '?'

  return (
    <div className="flex min-w-0 max-w-[200px] items-center gap-2">
      <Avatar size="sm">
        <AvatarImage src={logoUrl ?? undefined} alt="" />
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 truncate">{display}</span>
    </div>
  )
}

function StatusBadge({
  value,
  tone,
}: {
  value: string
  tone: 'neutral' | 'success' | 'warning'
}) {
  const variant = tone === 'neutral' ? 'secondary' : 'outline'
  const className =
    tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400'
        : undefined

  return (
    <Badge variant={variant} className={className}>
      {value}
    </Badge>
  )
}

export function getOrderColumns(callbacks: {
  onOpen: (row: Row<OrderRow>) => void
}): ColumnDef<OrderRow>[] {
  return [
    getSelectColumn<OrderRow>({
      renderRowEnd: (row) => (
        <DataTableRowActions
          row={row}
          permissions={{ canEdit: false, canDelete: false }}
          onEdit={() => undefined}
          onDelete={() => undefined}
          extraItems={(actionRow) => (
            <DropdownMenuItem onClick={() => callbacks.onOpen(actionRow)}>
              <EyeIcon />
              View Details
            </DropdownMenuItem>
          )}
        />
      ),
    }),
    {
      accessorKey: 'order_number',
      header: 'Order #',
      cell: ({ row }) => (
        <span className="font-medium">#{row.original.order_number}</span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'source_order_code',
      header: 'Source Code',
      cell: ({ row }) => row.original.source_order_code ?? '-',
    },
    {
      id: 'brands.name',
      accessorFn: (row) => row.brands?.name ?? '',
      header: 'Brand',
      cell: ({ row }) => (
        <LogoCell
          name={row.original.brands?.name}
          logoUrl={row.original.brands?.logo_url}
        />
      ),
      enableSorting: true,
    },
    {
      id: 'sources.name',
      accessorFn: (row) => row.sources?.name ?? '',
      header: 'Source',
      cell: ({ row }) => (
        <LogoCell
          name={row.original.sources?.name}
          logoUrl={row.original.sources?.logo_url}
        />
      ),
      enableSorting: true,
    },
    {
      id: 'sources.settlement_mode',
      accessorFn: (row) => row.sources?.settlement_mode ?? '',
      header: 'Settlement',
      cell: ({ row }) => {
        const mode = row.original.sources?.settlement_mode ?? null
        if (mode === null) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <StatusBadge
            value={settlementModeLabel(mode)}
            tone={mode === 'cash_now' ? 'success' : 'warning'}
          />
        )
      },
    },
    {
      accessorKey: 'kitchen_status',
      header: 'Kitchen',
      cell: ({ row }) => {
        const status = row.original.kitchen_status
        return (
          <StatusBadge
            value={kitchenStatusLabel(status)}
            tone={status === 'completed' ? 'success' : status === 'ready' ? 'warning' : 'neutral'}
          />
        )
      },
    },
    {
      accessorKey: 'payment_status',
      header: 'Payment',
      cell: ({ row }) => (
        <StatusBadge
          value={paymentStatusLabel(row.original.payment_status)}
          tone={row.original.payment_status === 'paid' ? 'success' : 'neutral'}
        />
      ),
    },
    {
      accessorKey: 'net_amount',
      header: 'Net',
      cell: ({ row }) => formatAmount(row.original.net_amount),
      enableSorting: true,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => formatDateTime(row.original.created_at),
      enableSorting: true,
    },
  ]
}
