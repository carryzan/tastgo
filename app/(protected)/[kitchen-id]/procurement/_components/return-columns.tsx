'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Eye } from 'lucide-react'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'

export interface SupplierReturn {
  id: string
  kitchen_id: string
  purchase_id: string
  supplier_id: string
  status: 'pending' | 'approved' | 'credited'
  total_credit_value: string | number
  created_by: string
  created_at: string
  updated_at: string
  suppliers: { id: string; name: string } | null
  purchases: { id: string; purchase_number: number } | null
  created_member: { id: string; profiles: { full_name: string } | null } | null
}

export const returnColumnConfigs: ColumnConfig[] = [
  { column: 'status', label: 'Status', type: 'select', options: ['pending', 'approved', 'credited'] },
  { column: 'total_credit_value', label: 'Credit value', type: 'number', sortable: true },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  pending: 'outline',
  approved: 'secondary',
  credited: 'default',
}

function formatAmount(value: string | number) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function getReturnColumns(
  permissions: Permission,
  callbacks: {
    onViewDetail: (row: Row<SupplierReturn>) => void
  }
): ColumnDef<SupplierReturn>[] {
  const extraItems = (row: Row<SupplierReturn>): ReactNode => (
    <DropdownMenuItem onClick={() => callbacks.onViewDetail(row)}>
      <Eye />
      View detail
    </DropdownMenuItem>
  )

  return [
    getSelectColumn<SupplierReturn>({
      renderRowEnd: (row) => (
        <DataTableRowActions
          row={row}
          permissions={{ canEdit: false, canDelete: false }}
          onEdit={() => {}}
          onDelete={() => {}}
          extraItems={extraItems}
        />
      ),
    }),
    {
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => row.original.suppliers?.name ?? '—',
      enableSorting: false,
    },
    {
      id: 'purchase',
      header: 'Purchase',
      cell: ({ row }) =>
        row.original.purchases
          ? `#${row.original.purchases.purchase_number}`
          : '—',
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANTS[row.original.status] ?? 'outline'}>
          {row.original.status.charAt(0).toUpperCase() + row.original.status.slice(1)}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'total_credit_value',
      header: 'Credit value',
      cell: ({ row }) => formatAmount(row.original.total_credit_value),
      enableSorting: true,
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
  ]
}
