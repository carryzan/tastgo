'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { replaceMenuItemModifierGroups } from '../_lib/menu-item-actions'
import { MENU_ITEMS_QUERY_KEY } from '../_lib/queries'
import {
  fetchModifierGroupsForBrand,
  fetchMenuItemModifierLinks,
  type ModifierGroupPick,
  type ModifierGroupLink,
} from '../_lib/client-queries'
import type { MenuItem } from './menu-item-columns'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldError } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'

interface ManageMenuItemModifiersSheetProps {
  item: MenuItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageMenuItemModifiersSheet({
  item,
  open,
  onOpenChange,
}: ManageMenuItemModifiersSheetProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupPick[]>([])
  const [links, setLinks] = useState<ModifierGroupLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [groups, joinRows] = await Promise.all([
        fetchModifierGroupsForBrand(kitchen.id, item.brand_id),
        fetchMenuItemModifierLinks(item.id),
      ])
      setModifierGroups(groups)
      setLinks(joinRows)
    } catch {
      setError('Failed to load modifier groups.')
    } finally {
      setLoading(false)
    }
  }, [kitchen.id, item.brand_id, item.id])

  useEffect(() => {
    if (!open) return
    setError(null)
    void load()
  }, [open, load])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setLoading(true)
    }
  }

  function addRow() {
    setLinks((prev) => [
      ...prev,
      { modifier_group_id: '', sort_order: prev.length },
    ])
  }

  function updateRow(index: number, patch: Partial<ModifierGroupLink>) {
    setLinks((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  function removeRow(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index))
  }

  const groupOptionsForRow = useMemo(() => {
    return (rowIndex: number) => {
      const selectedElsewhere = new Set(
        links
          .map((l, i) => (i === rowIndex ? '' : l.modifier_group_id))
          .filter(Boolean)
      )
      return modifierGroups.filter((g) => !selectedElsewhere.has(g.id))
    }
  }, [links, modifierGroups])

  function handleSubmit() {
    setError(null)

    const seen = new Set<string>()
    for (const row of links) {
      if (!row.modifier_group_id) continue
      if (seen.has(row.modifier_group_id)) {
        return setError('Each modifier group can only be attached once.')
      }
      seen.add(row.modifier_group_id)
    }

    const normalizedLinks = links
      .filter((r) => r.modifier_group_id)
      .map((r, i) => ({
        modifier_group_id: r.modifier_group_id,
        sort_order: Number.isFinite(r.sort_order) ? r.sort_order : i,
      }))

    startTransition(async () => {
      try {
        const result = await replaceMenuItemModifierGroups(
          item.id,
          kitchen.id,
          normalizedLinks
        )
        if (result instanceof Error) return setError(result.message)
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: MENU_ITEMS_QUERY_KEY })
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
          <SheetTitle>Modifier groups — {item.name}</SheetTitle>
          <SheetDescription>
            Attach and order modifier groups for this menu item.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-medium">Attached groups</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={loading || pending}
            >
              <PlusIcon />
              Attach group
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
                    Group
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Order
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-2">
                      <Skeleton className="h-8 w-full rounded-lg" />
                    </td>
                  </tr>
                ) : links.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-8 pl-4 text-center text-sm text-muted-foreground"
                    >
                      No modifier groups attached yet.
                    </td>
                  </tr>
                ) : (
                  links.map((row, index) => {
                    const options = groupOptionsForRow(index)
                    return (
                      <tr key={`${index}-${row.modifier_group_id}`} className="border-b">
                        <td className="py-1.5 pl-4 pr-2">
                          <Select
                            value={row.modifier_group_id || undefined}
                            onValueChange={(v) =>
                              updateRow(index, { modifier_group_id: v })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select group" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.name}
                                  {!g.is_active ? ' (inactive)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={row.sort_order}
                            onChange={(e) =>
                              updateRow(index, {
                                sort_order: Number.parseInt(e.target.value, 10) || 0,
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
                            onClick={() => removeRow(index)}
                            disabled={pending}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
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
          <Button onClick={handleSubmit} disabled={loading || pending} className="min-w-28">
            {pending && <Spinner data-icon="inline-start" />}
            Save
          </Button>
          <SheetClose asChild>
            <Button variant="outline" disabled={loading || pending}>
              Cancel
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
