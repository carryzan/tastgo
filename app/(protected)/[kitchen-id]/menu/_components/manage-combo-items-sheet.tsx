'use client'

import { useMemo, useState, useTransition } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { replaceComboItems } from '../_lib/combo-actions'
import { COMBOS_QUERY_KEY } from '../_lib/queries'
import { mapMenuDbError } from '../_lib/db-errors'
import {
  fetchMenuItemPicksForBrand,
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
  quantity: string
}

interface ManageComboItemsSheetProps {
  combo: Combo
  open: boolean
  onOpenChange: (open: boolean) => void
}

function parsePrice(v: number | string): number {
  return typeof v === 'string' ? Number(v) : v
}

function buildComboLines(combo: Combo): ComboLine[] {
  const ordered = [...(combo.combo_items ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  )

  return ordered.map((row) => ({
    key: row.id,
    menu_item_id: row.menu_item_id || row.menu_items?.id || '',
    quantity: String(
      typeof row.quantity === 'string'
        ? Number(row.quantity)
        : (row.quantity ?? 1)
    ),
  }))
}

export function ManageComboItemsSheet({
  combo,
  open,
  onOpenChange,
}: ManageComboItemsSheetProps) {
  const queryClient = useQueryClient()
  const [lines, setLines] = useState<ComboLine[]>(() => buildComboLines(combo))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { data: menuItems = [], isError: menuItemsLoadError } = useQuery({
    queryKey: ['combo-menu-item-picks', combo.kitchen_id, combo.brand_id],
    queryFn: () => fetchMenuItemPicksForBrand(combo.kitchen_id, combo.brand_id),
    enabled: open,
  })

  const menuIds = useMemo(() => menuItems.map((m) => m.id), [menuItems])
  const menuLabelById = useMemo(() => {
    const m = new Map<string, string>()
    for (const x of menuItems) m.set(x.id, x.name)
    return m
  }, [menuItems])

  // Price lookup by menu item id — populated from the embedded combo_items data
  // so the discounted-price check works without an extra fetch.
  const menuPriceById = useMemo(() => {
    const m = new Map<string, number>()
    for (const ci of combo.combo_items ?? []) {
      if (ci.menu_items) {
        m.set(ci.menu_item_id, parsePrice(ci.menu_items.price))
      }
    }
    return m
  }, [combo.combo_items])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setError(null)
  }

  function addLine() {
    setLines((p) => [
      ...p,
      { key: crypto.randomUUID(), menu_item_id: '', quantity: '1' },
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

  // Compute the Σ(price × quantity) total for discounted validation.
  const itemsTotal = useMemo(() => {
    let total = 0
    for (const line of lines) {
      if (!line.menu_item_id) continue
      const price = menuPriceById.get(line.menu_item_id) ?? 0
      const qty = Number.parseFloat(line.quantity)
      if (Number.isFinite(qty) && qty > 0) total += price * qty
    }
    return total
  }, [lines, menuPriceById])

  const discountedPriceInvalid =
    combo.pricing_type === 'discounted' &&
    itemsTotal > 0 &&
    parsePrice(combo.price) >= itemsTotal
  const displayedError =
    error ?? (menuItemsLoadError ? 'Failed to load menu items.' : null)

  function handleSubmit() {
    setError(null)

    const seen = new Set<string>()
    const rows: { menu_item_id: string; quantity: number }[] = []

    for (const line of lines) {
      if (!line.menu_item_id) continue
      if (seen.has(line.menu_item_id)) {
        return setError('Each menu item can only appear once in a combo.')
      }
      seen.add(line.menu_item_id)

      const qty = Number.parseFloat(line.quantity)
      if (Number.isNaN(qty) || qty <= 0) {
        return setError('All quantities must be greater than 0.')
      }
      rows.push({ menu_item_id: line.menu_item_id, quantity: qty })
    }

    if (discountedPriceInvalid) {
      return setError(
        `Discounted combo price (${parsePrice(combo.price).toFixed(3)}) must be less than the items total (${itemsTotal.toFixed(3)}). Edit the combo price first.`
      )
    }

    startTransition(async () => {
      try {
        const r = await replaceComboItems(combo.id, combo.kitchen_id, rows)
        if (r instanceof Error) return setError(mapMenuDbError(r))
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
                <col className="w-20" />
                <col className="w-12" />
              </colgroup>
              <thead className="sticky top-0 bg-popover">
                <tr className="border-y">
                  <th className="py-2 pl-4 pr-2 text-left font-medium text-muted-foreground">
                    Menu item
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Qty
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
                          type="text"
                          inputMode="decimal"
                          placeholder="1"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(idx, { quantity: e.target.value })
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

          {combo.pricing_type === 'discounted' && itemsTotal > 0 && (
            <div className="border-t px-4 py-2 text-xs text-muted-foreground">
              Items total:{' '}
              <span className="font-medium">{itemsTotal.toFixed(3)}</span>
              {discountedPriceInvalid && (
                <span className="ml-2 text-destructive">
                  — combo price must be less than this total
                </span>
              )}
            </div>
          )}
        </div>

        <div className="border-t" />

        {displayedError && (
          <div className="px-4 pt-3">
            <FieldError>{displayedError}</FieldError>
          </div>
        )}

        <SheetFooter>
          <Button
            onClick={handleSubmit}
            disabled={pending || discountedPriceInvalid}
            className="min-w-28"
          >
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
