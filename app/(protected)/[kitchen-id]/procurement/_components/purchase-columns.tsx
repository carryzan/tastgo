'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import {
  CheckCheckIcon,
  PackageCheckIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  SendIcon,
} from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'

export interface PurchaseAllocationEmbed {
  id: string
  amount: string | number
  voided_at: string | null
}

export interface Purchase {
  id: string
  kitchen_id: string
  supplier_id: string
  purchase_number: number
  supplier_invoice_code: string | null
  status: 'draft' | 'sent' | 'received'
  ordered_total: string | number
  received_total: string | number | null
  created_by: string
  received_by: string | null
  sent_at: string | null
  received_at: string | null
  created_at: string
  updated_at: string
  suppliers: { id: string; name: string } | null
  created_member: { id: string; profiles: { full_name: string } | null } | null
  received_member: { id: string; profiles: { full_name: string } | null } | null
  payment_allocations: PurchaseAllocationEmbed[] | null
  credit_allocations: PurchaseAllocationEmbed[] | null
}

export const purchaseColumnConfigs: ColumnConfig[] = [
  { column: 'purchase_number', label: 'Number', type: 'number', sortable: true },
  { column: 'status', label: 'Status', type: 'select', options: ['draft', 'sent', 'received'] },
  { column: 'ordered_total', label: 'Ordered total', type: 'number', sortable: true },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
  { column: 'received_at', label: 'Received', type: 'date', sortable: true },
]



const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  sent: 'secondary',
  received: 'default',
}

function formatAmount(value: string | number | null | undefined) {
  if (value == null) return '—'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getPurchaseColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<Purchase>) => void
    onMarkSent: (row: Row<Purchase>) => void
    onReceive: (row: Row<Purchase>) => void
    onPayments: (row: Row<Purchase>) => void
    onCreateReturn: (row: Row<Purchase>) => void
    onReassign: (row: Row<Purchase>) => void
  }
): ColumnDef<Purchase>[] {
  const showRowActions = true

  const extraItems = (row: Row<Purchase>): ReactNode => {
    const { status } = row.original
    return (
      <>
        {status === 'draft' && (
          <DropdownMenuItem onClick={() => callbacks.onMarkSent(row)}>
            <SendIcon />
            Mark as sent
          </DropdownMenuItem>
        )}
        {status === 'sent' && (
          <DropdownMenuItem onClick={() => callbacks.onReceive(row)}>
            <PackageCheckIcon />
            Receive
          </DropdownMenuItem>
        )}
        {status === 'received' && (
          <>
            <DropdownMenuItem onClick={() => callbacks.onPayments(row)}>
              <ReceiptTextIcon />
              Settlements
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => callbacks.onCreateReturn(row)}>
              <RotateCcwIcon />
              Create return
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => callbacks.onReassign(row)}>
              <RotateCcwIcon />
              Reassign supplier
            </DropdownMenuItem>
          </>
        )}
      </>
    )
  }

  return [
    getSelectColumn<Purchase>(
      showRowActions
        ? {
            renderRowEnd: (row) => {
              const canEditDraft = permissions.canEdit && row.original.status === 'draft'

              return (
                <DataTableRowActions
                  row={row}
                  permissions={{ canEdit: canEditDraft, canDelete: false }}
                  onEdit={callbacks.onEdit}
                  onDelete={() => {}}
                  extraItems={extraItems}
                />
              )
            },
          }
        : undefined
    ),
    {
      accessorKey: 'purchase_number',
      header: '#',
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">#{row.original.purchase_number}</span>
      ),
      enableSorting: true,
    },
    {
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => row.original.suppliers?.name ?? '—',
      enableSorting: false,
    },
    {
      accessorKey: 'supplier_invoice_code',
      header: 'Invoice code',
      cell: ({ row }) => row.original.supplier_invoice_code ?? '—',
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANTS[row.original.status] ?? 'outline'}>
          <CheckCheckIcon />
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'ordered_total',
      header: 'Ordered total',
      cell: ({ row }) => formatAmount(row.original.ordered_total),
      enableSorting: true,
    },
    {
      accessorKey: 'received_total',
      header: 'Received total',
      cell: ({ row }) => formatAmount(row.original.received_total),
      enableSorting: false,
    },
    {
      id: 'open_balance',
      header: 'Open balance',
      cell: ({ row }) => {
        const { status, received_total, payment_allocations, credit_allocations } = row.original
        if (status !== 'received' || received_total == null) return '—'
        const total = typeof received_total === 'string' ? Number(received_total) : received_total
        const paidSum = (payment_allocations ?? [])
          .filter((a) => a.voided_at === null)
          .reduce((s, a) => s + (typeof a.amount === 'string' ? Number(a.amount) : a.amount), 0)
        const creditSum = (credit_allocations ?? [])
          .filter((a) => a.voided_at === null)
          .reduce((s, a) => s + (typeof a.amount === 'string' ? Number(a.amount) : a.amount), 0)
        const open = total - paidSum - creditSum
        return formatAmount(open < 0 ? 0 : open)
      },
      enableSorting: false,
    },
    {
      id: 'created_by',
      header: 'Created by',
      cell: ({ row }) =>
        row.original.created_member?.profiles?.full_name ?? '—',
      enableSorting: false,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      enableSorting: true,
    },
    {
      accessorKey: 'received_at',
      header: 'Received',
      cell: ({ row }) =>
        row.original.received_at
          ? new Date(row.original.received_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '—',
      enableSorting: true,
    },
  ]
}
