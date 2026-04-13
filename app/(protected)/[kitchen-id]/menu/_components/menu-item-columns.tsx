'use client'

import type { ReactNode } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { BookOpenIcon, ListIcon, PlusCircleIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { getSelectColumn } from '@/components/data-table/data-table-select-column'
import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import type { ColumnConfig, Permission } from '@/lib/types/data-table'

export interface MenuItem {
  id: string
  kitchen_id: string
  brand_id: string
  menu_id: string
  name: string
  price: number | string
  image_url: string | null
  current_recipe_version_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  brands: { id: string; name: string } | null
  menus: { id: string; name: string } | null
  menu_item_recipe_versions: { id: string; version_number: number }[]
}

export const menuItemColumnConfigs: ColumnConfig[] = [
  { column: 'name', label: 'Name', type: 'text', sortable: true },
  { column: 'brands.name', label: 'Brand', type: 'text', sortable: true },
  { column: 'menus.name', label: 'Menu', type: 'text', sortable: true },
  { column: 'price', label: 'Price', type: 'number', sortable: true },
  { column: 'is_active', label: 'Active', type: 'boolean' },
  { column: 'created_at', label: 'Created', type: 'date', sortable: true },
]

function formatPrice(value: number | string) {
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

export function getMenuItemColumns(
  permissions: Permission,
  callbacks: {
    onEdit: (row: Row<MenuItem>) => void
    onDelete: (row: Row<MenuItem>) => void
    onVersionHistory: (row: Row<MenuItem>) => void
    onNewVersion: (row: Row<MenuItem>) => void
    onManageModifiers: (row: Row<MenuItem>) => void
  }
): ColumnDef<MenuItem>[] {
  const showRowActions = Boolean(permissions.canEdit || permissions.canDelete)

  const extraItems = (row: Row<MenuItem>): ReactNode => (
    <>
      <DropdownMenuItem onClick={() => callbacks.onManageModifiers(row)}>
        <ListIcon />
        Manage Modifiers
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => callbacks.onVersionHistory(row)}>
        <BookOpenIcon />
        Version History
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => callbacks.onNewVersion(row)}>
        <PlusCircleIcon />
        New Version
      </DropdownMenuItem>
    </>
  )

  return [
    getSelectColumn<MenuItem>(
      showRowActions
        ? {
            renderRowEnd: (row) => (
              <DataTableRowActions
                row={row}
                permissions={permissions}
                onEdit={callbacks.onEdit}
                onDelete={callbacks.onDelete}
                extraItems={extraItems}
              />
            ),
          }
        : undefined
    ),
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const { name, image_url } = row.original
        return (
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              {image_url && <AvatarImage src={image_url} alt={name} />}
              <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{name}</span>
          </div>
        )
      },
      enableSorting: true,
    },
    {
      id: 'brands.name',
      accessorFn: (row) => row.brands?.name ?? '',
      header: 'Brand',
      cell: ({ row }) => row.original.brands?.name ?? '—',
      enableSorting: true,
    },
    {
      id: 'menus.name',
      accessorFn: (row) => row.menus?.name ?? '',
      header: 'Menu',
      cell: ({ row }) => row.original.menus?.name ?? '—',
      enableSorting: true,
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => formatPrice(row.original.price),
      enableSorting: true,
    },
    {
      id: 'version',
      header: 'Version',
      cell: ({ row }) => {
        const { current_recipe_version_id, menu_item_recipe_versions } =
          row.original
        if (!current_recipe_version_id) return '—'
        const v = menu_item_recipe_versions.find(
          (x) => x.id === current_recipe_version_id
        )
        return v ? `v${v.version_number}` : '—'
      },
      enableSorting: false,
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (row.original.is_active ? 'Active' : 'Inactive'),
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
