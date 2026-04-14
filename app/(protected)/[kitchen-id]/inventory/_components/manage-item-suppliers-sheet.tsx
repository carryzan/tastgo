'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { replaceItemSuppliers } from '../_lib/item-supplier-actions'
import { INVENTORY_QUERY_KEY } from '../_lib/queries'
import {
  fetchSuppliersForKitchen,
  fetchItemSupplierLinks,
  type SupplierOption,
  type ItemSupplierLink,
} from '../_lib/client-queries'
import type { InventoryItem } from './columns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
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

interface LinkRow {
  supplier_id: string
  current_unit_cost: string
  is_preferred: boolean
  is_active: boolean
}

interface ManageItemSuppliersSheetProps {
  item: InventoryItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageItemSuppliersSheet({
  item,
  open,
  onOpenChange,
}: ManageItemSuppliersSheetProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [links, setLinks] = useState<LinkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [supplierOptions, linkRows] = await Promise.all([
        fetchSuppliersForKitchen(kitchen.id),
        fetchItemSupplierLinks(item.id),
      ])
      setSuppliers(supplierOptions)
      setLinks(
        linkRows.map((r: ItemSupplierLink) => ({
          supplier_id: r.supplier_id,
          current_unit_cost: String(r.current_unit_cost),
          is_preferred: r.is_preferred,
          is_active: r.is_active,
        }))
      )
    } catch {
      setError('Failed to load supplier data.')
    } finally {
      setLoading(false)
    }
  }, [kitchen.id, item.id])

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
      { supplier_id: '', current_unit_cost: '', is_preferred: false, is_active: true },
    ])
  }

  function updateRow(index: number, patch: Partial<LinkRow>) {
    setLinks((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
  }

  function removeRow(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index))
  }

  const supplierOptionsForRow = useMemo(() => {
    return (rowIndex: number) => {
      const selectedElsewhere = new Set(
        links
          .map((l, i) => (i === rowIndex ? '' : l.supplier_id))
          .filter(Boolean)
      )
      return suppliers.filter((s) => !selectedElsewhere.has(s.id))
    }
  }, [links, suppliers])

  function handleSubmit() {
    setError(null)

    const seen = new Set<string>()
    for (const row of links) {
      if (!row.supplier_id) continue
      if (seen.has(row.supplier_id)) {
        return setError('Each supplier can only be linked once.')
      }
      seen.add(row.supplier_id)
    }

    const validLinks = links.filter((r) => r.supplier_id)

    for (const row of validLinks) {
      if (row.current_unit_cost === '' || Number(row.current_unit_cost) < 0) {
        return setError('Enter a valid unit cost for each supplier (0 or greater).')
      }
    }

    startTransition(async () => {
      try {
        const result = await replaceItemSuppliers(
          item.id,
          kitchen.id,
          validLinks.map((r) => ({
            supplier_id: r.supplier_id,
            current_unit_cost: Number(r.current_unit_cost),
            is_preferred: r.is_preferred,
            is_active: r.is_active,
          }))
        )
        if (result instanceof Error) return setError(result.message)
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
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
          <SheetTitle>Manage Suppliers — {item.name}</SheetTitle>
          <SheetDescription>
            Link suppliers and their unit costs for this inventory item.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-medium">Linked suppliers</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={loading || pending}
            >
              <PlusIcon />
              Add supplier
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-28" />
                <col className="w-14 text-center" />
                <col className="w-14 text-center" />
                <col className="w-12" />
              </colgroup>
              <thead className="sticky top-0 bg-popover">
                <tr className="border-y">
                  <th className="py-2 pl-4 pr-2 text-left font-medium text-muted-foreground">
                    Supplier
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Unit cost
                  </th>
                  <th className="px-1 py-2 text-center font-medium text-muted-foreground">
                    Preferred
                  </th>
                  <th className="px-1 py-2 text-center font-medium text-muted-foreground">
                    Active
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-2">
                      <Skeleton className="h-8 w-full rounded-lg" />
                    </td>
                  </tr>
                ) : links.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 pl-4 text-center text-sm text-muted-foreground"
                    >
                      No suppliers linked yet. Click "Add supplier" to begin.
                    </td>
                  </tr>
                ) : (
                  links.map((row, index) => {
                    const options = supplierOptionsForRow(index)
                    return (
                      <tr
                        key={`${index}-${row.supplier_id}`}
                        className="border-b last:border-0"
                      >
                        <td className="py-1.5 pl-4 pr-2">
                          <Select
                            value={row.supplier_id || undefined}
                            onValueChange={(v) => updateRow(index, { supplier_id: v })}
                            disabled={pending}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                  {!s.is_active ? ' (inactive)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.000001"
                            value={row.current_unit_cost}
                            onChange={(e) =>
                              updateRow(index, { current_unit_cost: e.target.value })
                            }
                            disabled={pending}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <Checkbox
                            checked={row.is_preferred}
                            onCheckedChange={(checked) =>
                              updateRow(index, { is_preferred: Boolean(checked) })
                            }
                            disabled={pending}
                            aria-label="Preferred supplier"
                          />
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <Switch
                            checked={row.is_active}
                            onCheckedChange={(checked) =>
                              updateRow(index, { is_active: checked })
                            }
                            disabled={pending}
                            aria-label="Supplier active"
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
          <Button
            onClick={handleSubmit}
            disabled={loading || pending}
            className="min-w-28"
          >
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
