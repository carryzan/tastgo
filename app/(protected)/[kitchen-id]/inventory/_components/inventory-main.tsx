'use client'

import { useState, useMemo, useCallback } from 'react'
import { RulerIcon } from 'lucide-react'
import type { Row } from '@tanstack/react-table'
import { useKitchen } from '@/hooks/use-kitchen'
import { useServerTable } from '@/hooks/use-server-table'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableDeleteDialog } from '@/components/data-table/data-table-delete-dialog'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { Permission } from '@/lib/types/data-table'
import {
  getInventoryColumns,
  type InventoryItem,
} from './columns'
import { InventorySiteHeader } from './inventory-site-header'
import { AddInventoryItemSheet } from './add-inventory-item-sheet'
import { EditInventoryItemSheet } from './edit-inventory-item-sheet'
import { UOMConfigDialog } from './uom-config-dialog'
import {
  INVENTORY_QUERY_KEY,
  INVENTORY_SELECT,
  INVENTORY_FROM,
} from '../_lib/queries'
import type { InventoryCategory } from '../_lib/inventory-categories'

interface InventoryMainProps {
  initialCategories: InventoryCategory[]
}

export function InventoryMain({ initialCategories }: InventoryMainProps) {
  const { kitchen } = useKitchen()

  // TODO: derive from usePermission once permission strings are defined
  const permissions = useMemo<Permission>(
    () => ({ canEdit: true, canDelete: true }),
    []
  )

  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null)
  const [uomConfigItem, setUomConfigItem] = useState<InventoryItem | null>(null)

  const handleEdit = useCallback((row: Row<InventoryItem>) => {
    setEditItem(row.original)
  }, [])

  const handleDelete = useCallback((row: Row<InventoryItem>) => {
    setDeleteTarget(row.original)
  }, [])

  const getKitchenAssetUrl = useCallback((row: InventoryItem) => row.image_url, [])

  const extraItems = useCallback(
    (row: Row<InventoryItem>) => (
      <DropdownMenuItem onClick={() => setUomConfigItem(row.original)}>
        <RulerIcon />
        UOM Config
      </DropdownMenuItem>
    ),
    []
  )

  const columns = useMemo(
    () =>
      getInventoryColumns(permissions, {
        onEdit: handleEdit,
        onDelete: handleDelete,
        extraItems,
      }),
    [permissions, handleEdit, handleDelete, extraItems]
  )

  const { table, isFetching, deleteMutation, search, setSearch } =
    useServerTable<InventoryItem>({
      queryKey: INVENTORY_QUERY_KEY,
      from: INVENTORY_FROM,
      select: INVENTORY_SELECT,
      columns,
      searchColumn: 'name',
      kitchenId: kitchen.id,
      getKitchenAssetUrl,
    })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <InventorySiteHeader
        table={table}
        kitchenId={kitchen.id}
        categories={initialCategories}
        onAddItem={() => setAddOpen(true)}
        search={search}
        onSearchChange={setSearch}
      />
      <DataTable table={table} isFetching={isFetching} />
      <AddInventoryItemSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={initialCategories}
      />
      {editItem && (
        <EditInventoryItemSheet
          item={editItem}
          open={!!editItem}
          categories={initialCategories}
          onOpenChange={(next) => {
            if (!next) setEditItem(null)
          }}
        />
      )}
      <DataTableDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget, {
              onSuccess: () => setDeleteTarget(null),
            })
          }
        }}
        isLoading={deleteMutation.isPending}
      />
      {uomConfigItem && (
        <UOMConfigDialog
          itemId={uomConfigItem.id}
          itemName={uomConfigItem.name}
          open={!!uomConfigItem}
          onOpenChange={(next) => {
            if (!next) setUomConfigItem(null)
          }}
        />
      )}
    </div>
  )
}
