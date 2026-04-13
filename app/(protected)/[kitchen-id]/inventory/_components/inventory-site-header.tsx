'use client'

import { useState } from 'react'
import type { Table } from '@tanstack/react-table'
import { MoreHorizontalIcon, SettingsIcon } from 'lucide-react'
import { DataTableFilter } from '@/components/data-table/data-table-filter'
import { DataTableSort } from '@/components/data-table/data-table-sort'
import { SiteHeader } from '@/components/layout/site-header'
import { ExpandableSearch } from '@/components/shared/expandable-search'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { inventoryColumnConfigs, type InventoryItem } from './columns'
import { ManageCategoriesDialog } from './manage-categories-dialog'
import type { InventoryCategory } from '../_lib/inventory-categories'

interface InventorySiteHeaderProps {
  table: Table<InventoryItem>
  kitchenId: string
  categories: InventoryCategory[]
  onAddItem: () => void
  search: string
  onSearchChange: (value: string) => void
}

export function InventorySiteHeader({
  table,
  kitchenId,
  categories,
  onAddItem,
  search,
  onSearchChange,
}: InventorySiteHeaderProps) {
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)

  return (
    <>
      <SiteHeader title="Inventory">
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1">
          <ExpandableSearch value={search} onChange={onSearchChange} />
          <DataTableFilter
            table={table}
            columnConfigs={inventoryColumnConfigs}
          />
          <DataTableSort table={table} columnConfigs={inventoryColumnConfigs} />
          <Button size="sm" onClick={onAddItem}>
            Add Item
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Inventory options"
              >
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => setManageCategoriesOpen(true)}>
                <SettingsIcon />
                Manage Categories
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SiteHeader>
      <ManageCategoriesDialog
        open={manageCategoriesOpen}
        onOpenChange={setManageCategoriesOpen}
        kitchenId={kitchenId}
        categories={categories}
      />
    </>
  )
}
