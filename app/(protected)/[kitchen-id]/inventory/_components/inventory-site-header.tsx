'use client'

import { useState } from 'react'
import type { Table } from '@tanstack/react-table'
import { ChevronDownIcon, SettingsIcon } from 'lucide-react'
import { DataTableFilter } from '@/components/data-table/data-table-filter'
import { DataTableSort } from '@/components/data-table/data-table-sort'
import { SiteHeader } from '@/components/layout/site-header'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
}

export function InventorySiteHeader({
  table,
  kitchenId,
  categories,
  onAddItem,
}: InventorySiteHeaderProps) {
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)

  return (
    <>
      <SiteHeader title="Inventory">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
          <DataTableFilter
            table={table}
            columnConfigs={inventoryColumnConfigs}
          />
          <DataTableSort
            table={table}
            columnConfigs={inventoryColumnConfigs}
          />
          <ButtonGroup>
            <Button variant="outline" size="sm" onClick={onAddItem}>
              Add Item
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="pl-2!">
                  <ChevronDownIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onSelect={() => setManageCategoriesOpen(true)}
                  >
                    <SettingsIcon />
                    Manage Categories
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
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
