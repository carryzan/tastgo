'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Row } from '@tanstack/react-table'
import { MoreHorizontalIcon, Settings2Icon } from 'lucide-react'
import { useKitchen } from '@/hooks/use-kitchen'
import { useServerTable } from '@/hooks/use-server-table'
import { DataTableDeleteDialog } from '@/components/data-table/data-table-delete-dialog'
import { DataTableFilter } from '@/components/data-table/data-table-filter'
import { DataTableSort } from '@/components/data-table/data-table-sort'
import { ExpandableSearch } from '@/components/shared/expandable-search'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import type { Permission } from '@/lib/types/data-table'
import type { Menu } from '../_lib/menus'
import {
  getMenuItemColumns,
  menuItemColumnConfigs,
  type MenuItem,
} from './menu-item-columns'
import {
  getModifierGroupColumns,
  modifierGroupColumnConfigs,
  type ModifierGroup,
} from './modifier-group-columns'
import { getComboColumns, comboColumnConfigs, type Combo } from './combo-columns'
import { MenuSiteHeader } from './menu-site-header'
import { MenuItemsMain } from './menu-items-main'
import { ModifierGroupsMain } from './modifier-groups-main'
import { CombosMain } from './combos-main'
import { EditMenuItemSheet } from './edit-menu-item-sheet'
import { ManageMenuItemModifiersSheet } from './manage-menu-item-modifiers-sheet'
import { AddRecipeVersionSheet } from './add-recipe-version-sheet'
import { RecipeVersionHistorySheet } from './recipe-version-history-sheet'
import { AddMenuItemSheet } from './add-menu-item-sheet'
import { ManageMenusDialog } from './manage-menus-dialog'
import { AddModifierGroupSheet } from './add-modifier-group-sheet'
import { EditModifierGroupSheet } from './edit-modifier-group-sheet'
import { ManageModifierOptionsSheet } from './manage-modifier-options-sheet'
import { AddComboSheet } from './add-combo-sheet'
import { EditComboSheet } from './edit-combo-sheet'
import { ManageComboItemsSheet } from './manage-combo-items-sheet'
import {
  MENU_ITEMS_QUERY_KEY,
  MENU_ITEMS_FROM,
  MENU_ITEMS_SELECT,
  MODIFIER_GROUPS_QUERY_KEY,
  MODIFIER_GROUPS_FROM,
  MODIFIER_GROUPS_SELECT,
  COMBOS_QUERY_KEY,
  COMBOS_FROM,
  COMBOS_SELECT,
} from '../_lib/queries'
import { useMenuBrandOptions } from './menu-brand-field'

interface MenuMainProps {
  initialMenus: Menu[]
}

export function MenuMain({ initialMenus }: MenuMainProps) {
  const { kitchen } = useKitchen()
  const kitchenBrands = useMenuBrandOptions()
  const hasBrands = kitchenBrands.length > 0
  const [activeTab, setActiveTab] = useState('menu-items')
  const [addMenuItemOpen, setAddMenuItemOpen] = useState(false)
  const [manageMenusOpen, setManageMenusOpen] = useState(false)
  const [addModifierGroupOpen, setAddModifierGroupOpen] = useState(false)
  const [addComboOpen, setAddComboOpen] = useState(false)

  const permissions = useMemo<Permission>(
    () => ({ canEdit: true, canDelete: true }),
    []
  )

  // Menu item state
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [deleteMenuItemTarget, setDeleteMenuItemTarget] =
    useState<MenuItem | null>(null)
  const [versionHistoryItem, setVersionHistoryItem] = useState<MenuItem | null>(
    null
  )
  const [newVersionItem, setNewVersionItem] = useState<MenuItem | null>(null)
  const [manageModifiersItem, setManageModifiersItem] =
    useState<MenuItem | null>(null)

  // Modifier group state
  const [editModifierGroup, setEditModifierGroup] =
    useState<ModifierGroup | null>(null)
  const [deleteModifierGroupTarget, setDeleteModifierGroupTarget] =
    useState<ModifierGroup | null>(null)
  const [manageOptionsGroup, setManageOptionsGroup] =
    useState<ModifierGroup | null>(null)

  // Combo state
  const [editCombo, setEditCombo] = useState<Combo | null>(null)
  const [deleteComboTarget, setDeleteComboTarget] = useState<Combo | null>(null)
  const [manageItemsCombo, setManageItemsCombo] = useState<Combo | null>(null)

  // Menu item callbacks
  const handleEditMenuItem = useCallback((row: Row<MenuItem>) => {
    setEditItem(row.original)
  }, [])

  const handleDeleteMenuItem = useCallback((row: Row<MenuItem>) => {
    setDeleteMenuItemTarget(row.original)
  }, [])

  const handleVersionHistory = useCallback((row: Row<MenuItem>) => {
    setVersionHistoryItem(row.original)
  }, [])

  const handleNewVersion = useCallback((row: Row<MenuItem>) => {
    setNewVersionItem(row.original)
  }, [])

  const handleManageModifiers = useCallback((row: Row<MenuItem>) => {
    setManageModifiersItem(row.original)
  }, [])

  const getMenuItemAssetUrl = useCallback((row: MenuItem) => row.image_url, [])

  const menuItemColumns = useMemo(
    () =>
      getMenuItemColumns(permissions, {
        onEdit: handleEditMenuItem,
        onDelete: handleDeleteMenuItem,
        onVersionHistory: handleVersionHistory,
        onNewVersion: handleNewVersion,
        onManageModifiers: handleManageModifiers,
      }),
    [
      permissions,
      handleEditMenuItem,
      handleDeleteMenuItem,
      handleVersionHistory,
      handleNewVersion,
      handleManageModifiers,
    ]
  )

  const {
    table: menuItemTable,
    isFetching: menuItemsFetching,
    deleteMutation: menuItemDeleteMutation,
    search: menuItemSearch,
    setSearch: setMenuItemSearch,
  } = useServerTable<MenuItem>({
    queryKey: MENU_ITEMS_QUERY_KEY,
    from: MENU_ITEMS_FROM,
    select: MENU_ITEMS_SELECT,
    columns: menuItemColumns,
    searchColumn: 'name',
    kitchenId: kitchen.id,
    getKitchenAssetUrl: getMenuItemAssetUrl,
  })

  // Modifier group callbacks
  const handleEditModifierGroup = useCallback((row: Row<ModifierGroup>) => {
    setEditModifierGroup(row.original)
  }, [])

  const handleDeleteModifierGroup = useCallback((row: Row<ModifierGroup>) => {
    setDeleteModifierGroupTarget(row.original)
  }, [])

  const handleManageOptions = useCallback((row: Row<ModifierGroup>) => {
    setManageOptionsGroup(row.original)
  }, [])

  const modifierGroupColumns = useMemo(
    () =>
      getModifierGroupColumns(permissions, {
        onEdit: handleEditModifierGroup,
        onDelete: handleDeleteModifierGroup,
        onManageOptions: handleManageOptions,
      }),
    [permissions, handleEditModifierGroup, handleDeleteModifierGroup, handleManageOptions]
  )

  const {
    table: modifierGroupTable,
    isFetching: modifierGroupsFetching,
    deleteMutation: modifierGroupDeleteMutation,
    search: modifierGroupSearch,
    setSearch: setModifierGroupSearch,
  } = useServerTable<ModifierGroup>({
    queryKey: MODIFIER_GROUPS_QUERY_KEY,
    from: MODIFIER_GROUPS_FROM,
    select: MODIFIER_GROUPS_SELECT,
    columns: modifierGroupColumns,
    searchColumn: 'name',
    kitchenId: kitchen.id,
  })

  // Combo callbacks
  const handleEditCombo = useCallback((row: Row<Combo>) => {
    setEditCombo(row.original)
  }, [])

  const handleDeleteCombo = useCallback((row: Row<Combo>) => {
    setDeleteComboTarget(row.original)
  }, [])

  const handleManageItems = useCallback((row: Row<Combo>) => {
    setManageItemsCombo(row.original)
  }, [])

  const comboColumns = useMemo(
    () =>
      getComboColumns(permissions, {
        onEdit: handleEditCombo,
        onDelete: handleDeleteCombo,
        onManageItems: handleManageItems,
      }),
    [permissions, handleEditCombo, handleDeleteCombo, handleManageItems]
  )

  const getComboAssetUrl = useCallback((row: Combo) => row.image_url, [])

  const {
    table: comboTable,
    isFetching: combosFetching,
    deleteMutation: comboDeleteMutation,
    search: comboSearch,
    setSearch: setComboSearch,
  } = useServerTable<Combo>({
    queryKey: COMBOS_QUERY_KEY,
    from: COMBOS_FROM,
    select: COMBOS_SELECT,
    columns: comboColumns,
    searchColumn: 'name',
    kitchenId: kitchen.id,
    getKitchenAssetUrl: getComboAssetUrl,
  })

  const menuItemsToolbar: ReactNode = (
    <>
      <ExpandableSearch value={menuItemSearch} onChange={setMenuItemSearch} />
      <DataTableFilter
        table={menuItemTable}
        columnConfigs={menuItemColumnConfigs}
      />
      <DataTableSort
        table={menuItemTable}
        columnConfigs={menuItemColumnConfigs}
      />
      <Button
        size="sm"
        onClick={() => setAddMenuItemOpen(true)}
        disabled={!hasBrands}
      >
        Add Menu Item
      </Button>
    </>
  )

  const modifierGroupsToolbar: ReactNode = (
    <>
      <ExpandableSearch
        value={modifierGroupSearch}
        onChange={setModifierGroupSearch}
      />
      <DataTableFilter
        table={modifierGroupTable}
        columnConfigs={modifierGroupColumnConfigs}
      />
      <DataTableSort
        table={modifierGroupTable}
        columnConfigs={modifierGroupColumnConfigs}
      />
      <Button
        size="sm"
        onClick={() => setAddModifierGroupOpen(true)}
        disabled={!hasBrands}
      >
        Add Modifier Group
      </Button>
    </>
  )

  const combosToolbar: ReactNode = (
    <>
      <ExpandableSearch value={comboSearch} onChange={setComboSearch} />
      <DataTableFilter
        table={comboTable}
        columnConfigs={comboColumnConfigs}
      />
      <DataTableSort table={comboTable} columnConfigs={comboColumnConfigs} />
      <Button
        size="sm"
        onClick={() => setAddComboOpen(true)}
        disabled={!hasBrands}
      >
        Add Combo
      </Button>
    </>
  )

  const headerTrailingSlot = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="More options">
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => setManageMenusOpen(true)}>
          <Settings2Icon />
          Manage menus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <MenuSiteHeader
          activeTab={activeTab}
          menuItemsToolbar={menuItemsToolbar}
          modifierGroupsToolbar={modifierGroupsToolbar}
          combosToolbar={combosToolbar}
          trailingSlot={headerTrailingSlot}
        />
        <TabsContent
          value="menu-items"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <MenuItemsMain
            table={menuItemTable}
            isFetching={menuItemsFetching}
          />
        </TabsContent>
        <TabsContent
          value="modifier-groups"
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <ModifierGroupsMain
            table={modifierGroupTable}
            isFetching={modifierGroupsFetching}
          />
        </TabsContent>
        <TabsContent value="combos" className="mt-0 flex min-h-0 flex-1 flex-col">
          <CombosMain table={comboTable} isFetching={combosFetching} />
        </TabsContent>
      </Tabs>

      {/* Add sheets */}
      <AddMenuItemSheet
        open={addMenuItemOpen}
        onOpenChange={setAddMenuItemOpen}
        menus={initialMenus}
      />
      <AddModifierGroupSheet
        open={addModifierGroupOpen}
        onOpenChange={setAddModifierGroupOpen}
        kitchenId={kitchen.id}
      />
      <AddComboSheet
        open={addComboOpen}
        onOpenChange={setAddComboOpen}
        kitchenId={kitchen.id}
      />

      {manageMenusOpen && (
        <ManageMenusDialog
          open={manageMenusOpen}
          onOpenChange={setManageMenusOpen}
          kitchenId={kitchen.id}
          menus={initialMenus}
        />
      )}

      {/* Menu item sheets */}
      {editItem && (
        <EditMenuItemSheet
          item={editItem}
          menus={initialMenus}
          open
          onOpenChange={(next) => {
            if (!next) setEditItem(null)
          }}
        />
      )}
      {manageModifiersItem && (
        <ManageMenuItemModifiersSheet
          item={manageModifiersItem}
          open
          onOpenChange={(next) => {
            if (!next) setManageModifiersItem(null)
          }}
        />
      )}
      {versionHistoryItem && (
        <RecipeVersionHistorySheet
          menuItem={versionHistoryItem}
          open
          onOpenChange={(next) => {
            if (!next) setVersionHistoryItem(null)
          }}
        />
      )}
      {newVersionItem && (
        <AddRecipeVersionSheet
          menuItem={newVersionItem}
          open
          onOpenChange={(next) => {
            if (!next) setNewVersionItem(null)
          }}
        />
      )}

      {/* Modifier group sheets */}
      {editModifierGroup && (
        <EditModifierGroupSheet
          group={editModifierGroup}
          open
          onOpenChange={(next) => {
            if (!next) setEditModifierGroup(null)
          }}
        />
      )}
      {manageOptionsGroup && (
        <ManageModifierOptionsSheet
          group={manageOptionsGroup}
          open
          onOpenChange={(next) => {
            if (!next) setManageOptionsGroup(null)
          }}
        />
      )}

      {/* Combo sheets */}
      {editCombo && (
        <EditComboSheet
          combo={editCombo}
          open
          onOpenChange={(next) => {
            if (!next) setEditCombo(null)
          }}
        />
      )}
      {manageItemsCombo && (
        <ManageComboItemsSheet
          combo={manageItemsCombo}
          open
          onOpenChange={(next) => {
            if (!next) setManageItemsCombo(null)
          }}
        />
      )}

      {/* Delete dialogs */}
      <DataTableDeleteDialog
        open={deleteMenuItemTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteMenuItemTarget(null)
        }}
        onConfirm={() => {
          if (deleteMenuItemTarget) {
            menuItemDeleteMutation.mutate(deleteMenuItemTarget, {
              onSuccess: () => setDeleteMenuItemTarget(null),
            })
          }
        }}
        isLoading={menuItemDeleteMutation.isPending}
      />
      <DataTableDeleteDialog
        open={deleteModifierGroupTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteModifierGroupTarget(null)
        }}
        onConfirm={() => {
          if (deleteModifierGroupTarget) {
            modifierGroupDeleteMutation.mutate(deleteModifierGroupTarget, {
              onSuccess: () => setDeleteModifierGroupTarget(null),
            })
          }
        }}
        isLoading={modifierGroupDeleteMutation.isPending}
      />
      <DataTableDeleteDialog
        open={deleteComboTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteComboTarget(null)
        }}
        onConfirm={() => {
          if (deleteComboTarget) {
            comboDeleteMutation.mutate(deleteComboTarget, {
              onSuccess: () => setDeleteComboTarget(null),
            })
          }
        }}
        isLoading={comboDeleteMutation.isPending}
      />
    </>
  )
}
