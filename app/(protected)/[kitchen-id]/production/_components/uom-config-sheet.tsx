'use client'

import { Fragment, useEffect, useMemo, useState, useTransition } from 'react'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  LockIcon,
  TrashIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useKitchen } from '@/hooks/use-kitchen'
import {
  saveProductionRecipeUomConfiguration,
  type ProductionRecipeUomConversionInput,
} from '../_lib/uom-config-actions'
import type { Recipe } from './recipe-columns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'

interface UOM {
  id: string
  name: string
  abbreviation: string
}

interface ConversionRow extends ProductionRecipeUomConversionInput {
  key: string
  is_active?: boolean
}

interface UomConfigSheetProps {
  recipe: Recipe
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CONTEXTS = [
  ['production', 'Production'],
  ['recipe', 'Recipe'],
  ['count', 'Count'],
  ['waste', 'Waste'],
  ['opening', 'Opening'],
] as const

type ContextKey = (typeof CONTEXTS)[number][0]

const allowKey = (context: ContextKey) =>
  `allow_${context}` as keyof ProductionRecipeUomConversionInput
const defaultKey = (context: ContextKey) =>
  `is_default_${context}` as keyof ProductionRecipeUomConversionInput

function createRow(uomId: string): ConversionRow {
  return {
    key: crypto.randomUUID(),
    uom_id: uomId,
    factor_to_storage: 1,
    allow_production: true,
    allow_recipe: true,
    allow_count: true,
    allow_waste: true,
    allow_opening: true,
    is_default_production: false,
    is_default_recipe: false,
    is_default_count: false,
    is_default_waste: false,
    is_default_opening: false,
    is_active: true,
  }
}

function toInput(row: ConversionRow): ProductionRecipeUomConversionInput {
  return {
    id: row.id,
    uom_id: row.uom_id,
    factor_to_storage: row.factor_to_storage,
    allow_production: row.allow_production,
    allow_recipe: row.allow_recipe,
    allow_count: row.allow_count,
    allow_waste: row.allow_waste,
    allow_opening: row.allow_opening,
    is_default_production: row.is_default_production,
    is_default_recipe: row.is_default_recipe,
    is_default_count: row.is_default_count,
    is_default_waste: row.is_default_waste,
    is_default_opening: row.is_default_opening,
  }
}

export function UomConfigSheet({
  recipe,
  open,
  onOpenChange,
}: UomConfigSheetProps) {
  const { kitchen, unitsOfMeasure } = useKitchen()
  const uoms = unitsOfMeasure as UOM[]

  const [loading, setLoading] = useState(true)
  const [storageUomId, setStorageUomId] = useState(recipe.storage_uom_id ?? '')
  const [rows, setRows] = useState<ConversionRow[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const uomById = useMemo(() => {
    const map = new Map<string, UOM>()
    for (const uom of uoms) map.set(uom.id, uom)
    return map
  }, [uoms])

  const disabled = loading || pending

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const supabase = createClient()

    void Promise.resolve().then(async () => {
      if (cancelled) return
      setLoading(true)
      setError(null)

      const [recipeResult, conversionsResult] = await Promise.all([
        supabase
          .from('production_recipes')
          .select('storage_uom_id')
          .eq('id', recipe.id)
          .eq('kitchen_id', kitchen.id)
          .single(),
        supabase
          .from('production_recipe_uom_conversions')
          .select('*')
          .eq('kitchen_id', kitchen.id)
          .eq('production_recipe_id', recipe.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
      ])

      if (cancelled) return
      if (recipeResult.error) {
        setError(recipeResult.error.message)
        setLoading(false)
        return
      }
      if (conversionsResult.error) {
        setError(conversionsResult.error.message)
        setLoading(false)
        return
      }

      const nextStorage =
        recipeResult.data?.storage_uom_id ?? recipe.storage_uom_id ?? uoms[0]?.id ?? ''
      const nextRows = ((conversionsResult.data ?? []) as ConversionRow[]).map((row) => ({
        ...row,
        key: row.id ?? crypto.randomUUID(),
      }))

      if (nextStorage && !nextRows.some((row) => row.uom_id === nextStorage)) {
        const identity = createRow(nextStorage)
        identity.factor_to_storage = 1
        identity.is_default_production = true
        identity.is_default_recipe = true
        identity.is_default_count = true
        identity.is_default_waste = true
        identity.is_default_opening = true
        nextRows.unshift(identity)
      }

      setStorageUomId(nextStorage)
      setRows(nextRows)
      setExpandedRows(new Set())
      setLoading(false)
    }).catch(() => {
      if (!cancelled) {
        setError('Failed to load UOM configuration.')
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [open, kitchen.id, recipe.id, recipe.storage_uom_id, uoms])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
  }

  function handleStorageChange(nextStorage: string) {
    setStorageUomId(nextStorage)
    setRows((current) => {
      const existing = current.find((row) => row.uom_id === nextStorage)
      if (existing) {
        setExpandedRows((expanded) => new Set([...expanded, existing.key]))
        return current.map((row) =>
          row.uom_id === nextStorage ? { ...row, factor_to_storage: 1 } : row
        )
      }

      const nextRow = createRow(nextStorage)
      setExpandedRows((expanded) => new Set([...expanded, nextRow.key]))
      return [nextRow, ...current]
    })
  }

  function toggleExpanded(rowKey: string) {
    setExpandedRows((current) => {
      const next = new Set(current)
      if (next.has(rowKey)) next.delete(rowKey)
      else next.add(rowKey)
      return next
    })
  }

  function updateRow(key: string, patch: Partial<ConversionRow>) {
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row
        const next = { ...row, ...patch }
        if (next.uom_id === storageUomId) next.factor_to_storage = 1
        return next
      })
    )
  }

  function updateDefault(rowKey: string, context: ContextKey, checked: boolean) {
    const dKey = defaultKey(context)
    const aKey = allowKey(context)
    setRows((current) =>
      current.map((row) => ({
        ...row,
        [dKey]: row.key === rowKey ? checked : false,
        [aKey]: row.key === rowKey && checked ? true : row[aKey],
      }))
    )
  }

  function addRow() {
    const used = new Set(rows.map((row) => row.uom_id))
    const nextUom = uoms.find((uom) => !used.has(uom.id))
    if (!nextUom) return
    const nextRow = createRow(nextUom.id)
    setRows((current) => [...current, nextRow])
    setExpandedRows((current) => new Set([...current, nextRow.key]))
  }

  function removeRow(rowKey: string) {
    setRows((current) => current.filter((row) => row.key !== rowKey))
    setExpandedRows((current) => {
      const next = new Set(current)
      next.delete(rowKey)
      return next
    })
  }

  function selectableUoms(row: ConversionRow) {
    const used = new Set(rows.filter((item) => item.key !== row.key).map((item) => item.uom_id))
    return uoms.filter((uom) => !used.has(uom.id))
  }

  function handleSave() {
    setError(null)
    if (!storageUomId) return setError('Select a storage UOM.')
    if (rows.length === 0) return setError('Add at least one UOM.')

    const seen = new Set<string>()
    for (const row of rows) {
      if (!row.uom_id) return setError('Each UOM row needs a unit.')
      if (seen.has(row.uom_id)) return setError('Each UOM can only be added once.')
      seen.add(row.uom_id)
      if (row.factor_to_storage <= 0) return setError('Conversion factors must be greater than 0.')
      if (row.uom_id === storageUomId && row.factor_to_storage !== 1) {
        return setError('Storage UOM conversion factor must be 1.')
      }
    }

    startTransition(async () => {
      const result = await saveProductionRecipeUomConfiguration({
        kitchen_id: kitchen.id,
        production_recipe_id: recipe.id,
        storage_uom_id: storageUomId,
        conversions: rows.map(toInput),
      })
      if (result instanceof Error) return setError(result.message)
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="sm:max-w-5xl"
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>Production UOM</SheetTitle>
          <SheetDescription>{recipe.name}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Storage UOM</FieldLabel>
                <Select
                  value={storageUomId || undefined}
                  onValueChange={handleStorageChange}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-64 max-w-full">
                    <SelectValue placeholder="Select storage UOM" />
                  </SelectTrigger>
                  <SelectContent>
                    {uoms.map((uom) => (
                      <SelectItem key={uom.id} value={uom.id}>
                        {uom.name} ({uom.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Conversions</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
                disabled={disabled || rows.length >= uoms.length}
              >
                Add UOM
              </Button>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] table-fixed text-sm">
                <colgroup>
                  <col className="w-10" />
                  <col className="w-56" />
                  <col className="w-40" />
                  <col className="w-28" />
                  <col className="w-12" />
                </colgroup>
                <thead className="bg-background">
                  <tr className="border-b">
                    <th className="py-2 pl-4 pr-1 text-left font-medium text-muted-foreground" />
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                      UOM
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                      Factor to storage
                    </th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="h-32 px-4 text-center text-muted-foreground">
                      Loading UOMs...
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isStorage = row.uom_id === storageUomId
                    const isExpanded = expandedRows.has(row.key)
                    const uom = uomById.get(row.uom_id)
                    return (
                      <Fragment key={row.key}>
                        <tr className="border-b" aria-expanded={isExpanded}>
                          <td className="py-1.5 pl-4 pr-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => toggleExpanded(row.key)}
                              disabled={disabled}
                            >
                              {isExpanded ? (
                                <ChevronDownIcon className="size-4" />
                              ) : (
                                <ChevronRightIcon className="size-4" />
                              )}
                            </Button>
                          </td>
                          <td className="px-2 py-1.5">
                            <Select
                              value={row.uom_id}
                              onValueChange={(value) => updateRow(row.key, { uom_id: value })}
                              disabled={disabled || isStorage}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select UOM" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectableUoms(row).map((option) => (
                                  <SelectItem key={option.id} value={option.id}>
                                    {option.name} ({option.abbreviation})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              min="0.000001"
                              step="0.000001"
                              value={row.factor_to_storage}
                              onChange={(event) =>
                                updateRow(row.key, {
                                  factor_to_storage: Number(event.target.value),
                                })
                              }
                              disabled={disabled || isStorage}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            {isStorage ? (
                              <Badge variant="secondary">
                                <LockIcon data-icon="inline-start" />
                                Storage
                              </Badge>
                            ) : (
                              <Badge variant="outline">Active</Badge>
                            )}
                          </td>
                          <td className="py-1.5 pl-1 pr-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => removeRow(row.key)}
                              disabled={disabled || isStorage}
                            >
                              <TrashIcon className="size-4" />
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b">
                            <td colSpan={5} className="bg-muted/30 p-0">
                              <div className="grid grid-cols-[1fr_96px_96px] border-b px-4 py-2 text-xs font-medium text-muted-foreground">
                                <div>Name</div>
                                <div className="text-center">Enable</div>
                                <div className="text-center">Default</div>
                              </div>
                              {CONTEXTS.map(([context, label]) => {
                                const aKey = allowKey(context)
                                const dKey = defaultKey(context)
                                const allowed = Boolean(row[aKey])
                                const isDefault = Boolean(row[dKey])
                                return (
                                  <div
                                    key={`${row.key}-${context}`}
                                    className="grid grid-cols-[1fr_96px_96px] items-center border-b px-4 py-3 last:border-b-0"
                                  >
                                    <div className="min-w-0">
                                      <div className="font-medium">{label}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {uom?.abbreviation ?? 'UOM'} in {label.toLowerCase()}
                                      </div>
                                    </div>
                                    <div className="flex justify-center">
                                      <Switch
                                        checked={allowed}
                                        disabled={disabled}
                                        onCheckedChange={(checked) =>
                                          updateRow(row.key, {
                                            [aKey]: checked,
                                            [dKey]: checked ? isDefault : false,
                                          } as Partial<ConversionRow>)
                                        }
                                      />
                                    </div>
                                    <div className="flex justify-center">
                                      <Switch
                                        checked={isDefault}
                                        disabled={disabled || !allowed}
                                        onCheckedChange={(checked) =>
                                          updateDefault(row.key, context, checked)
                                        }
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>

          {error ? (
            <FieldError className="px-4">{error}</FieldError>
          ) : null}

          <SheetFooter>
            <Button onClick={handleSave} disabled={disabled} className="min-w-24">
              {pending && <Spinner data-icon="inline-start" />}
              Save
            </Button>
            <SheetClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
