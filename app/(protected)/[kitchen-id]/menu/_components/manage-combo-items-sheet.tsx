'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { replaceComboItems } from '../_lib/combo-actions'
import { COMBOS_QUERY_KEY } from '../_lib/queries'
import {
  fetchMenuItemPicksForBrand,
  type MenuItemPick,
} from '../_lib/client-queries'
import type { Combo } from './combo-columns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { FieldError } from '@/components/ui/field'

interface ComboLine {
  key: string
  menu_item_id: string
  sort_order: number
}

interface ManageComboItemsSheetProps {
  combo: Combo
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageComboItemsSheet({
  combo,
  open,
  onOpenChange,
}: ManageComboItemsSheetProps) {
  const queryClient = useQueryClient()
  const [menuItems, setMenuItems] = useState<MenuItemPick[]>([])
  const [lines, setLines] = useState<ComboLine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const menuIds = useMemo(() => menuItems.map((m) => m.id), [menuItems])
  const menuLabelById = useMemo(() => {
    const m = new Map<string, string>()
    for (const x of menuItems) m.set(x.id, x.name)
    return m
  }, [menuItems])

  const loadMenus = useCallback(async () => {
    try {
      const items = await fetchMenuItemPicksForBrand(combo.kitchen_id, combo.brand_id)
      setMenuItems(items)
    } catch {
      setError('Failed to load menu items.')
    }
  }, [combo.kitchen_id, combo.brand_id])

  useEffect(() => {
    if (!open) return
    setError(null)
    void loadMenus()
    const ordered = [...(combo.combo_items ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order
    )
    setLines(
      ordered.map((row) => ({
        key: row.id,
        menu_item_id: row.menu_item_id || row.menu_items?.id || '',
        sort_order: row.sort_order,
      }))
    )
  }, [open, combo, loadMenus])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setError(null)
  }

  function addLine() {
    setLines((p) => [
      ...p,
      { key: crypto.randomUUID(), menu_item_id: '', sort_order: p.length },
    ])
  }

  function updateLine(index: number, patch: Partial<ComboLine>) {
    setLines((p) =>
      p.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  function removeLine(index: number) {
    setLines((p) => p.filter((_, i) => i !== index))
  }

  function handleSubmit() {
    setError(null)

    const seen = new Set<string>()
    const rows: { menu_item_id: string; sort_order: number }[] = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.menu_item_id) continue
      if (seen.has(line.menu_item_id)) {
        return setError('Each menu item can only appear once in a combo.')
      }
      seen.add(line.menu_item_id)
      rows.push({
        menu_item_id: line.menu_item_id,
        sort_order: Number.isFinite(line.sort_order) ? line.sort_order : i,
      })
    }

    startTransition(async () => {
      try {
        const r = await replaceComboItems(combo.id, combo.kitchen_id, rows)
        if (r instanceof Error) return setError(r.message)
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: COMBOS_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="sm:max-w-xl"
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>Combo items — {combo.name}</SheetTitle>
          <SheetDescription>
            Manage the menu items in this combo.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-medium">Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              disabled={pending}
            >
              <PlusIcon />
              Add item
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-24" />
                <col className="w-12" />
              </colgroup>
              <thead className="sticky top-0 bg-popover">
                <tr className="border-y">
                  <th className="py-2 pl-4 pr-2 text-left font-medium text-muted-foreground">
                    Menu item
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Order
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-8 pl-4 text-center text-sm text-muted-foreground"
                    >
                      No items in this combo yet.
                    </td>
                  </tr>
                ) : (
                  lines.map((line, idx) => (
                    <tr key={line.key} className="border-b">
                      <td className="py-1.5 pl-4 pr-2">
                        <Combobox
                          items={menuIds}
                          value={line.menu_item_id || null}
                          onValueChange={(next) =>
                            updateLine(idx, { menu_item_id: next ?? '' })
                          }
                          modal
                          itemToStringLabel={(id) =>
                            menuLabelById.get(String(id)) ?? ''
                          }
                        >
                          <ComboboxInput
                            placeholder="Select item"
                            className="w-full"
                          />
                          <ComboboxContent className="z-100 pointer-events-auto">
                            <ComboboxEmpty>No menu items.</ComboboxEmpty>
                            <ComboboxList>
                              {(id: string) => (
                                <ComboboxItem key={id} value={id}>
                                  {menuLabelById.get(id) ?? id}
                                </ComboboxItem>
                              )}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={line.sort_order}
                          onChange={(e) =>
                            updateLine(idx, {
                              sort_order:
                                Number.parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                      </td>
                      <td className="py-1.5 pl-1 pr-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeLine(idx)}
                          disabled={pending}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t" />

        {error && (
          <div className="px-4 pt-3">
            <FieldError>{error}</FieldError>
          </div>
        )}

        <SheetFooter>
          <Button onClick={handleSubmit} disabled={pending} className="min-w-28">
            {pending && <Spinner data-icon="inline-start" />}
            Save
          </Button>
          <SheetClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
