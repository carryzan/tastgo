'use client'

import { useState, useTransition, useEffect } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createClient } from '@/lib/supabase/client'
import { createRecipeVersion } from '../_lib/recipe-actions'
import { RECIPES_QUERY_KEY } from '../_lib/queries'
import type { Recipe } from './recipe-columns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Field, FieldLabel, FieldGroup, FieldError } from '@/components/ui/field'

interface InventoryItem {
  id: string
  name: string
}

interface UOM {
  id: string
  name: string
  abbreviation: string
}

interface RecipeComponent {
  id: string
  inventory_item_id: string
  recipe_quantity: string
  yield_adjusted_quantity: string
  uom_id: string
  inventory_items?: { name: string } | null
  units_of_measure?: { abbreviation: string } | null
}

interface ComponentRow {
  inventory_item_id: string
  recipe_quantity: string
  uom_id: string
}

interface RecipeVersionSheetProps {
  recipe: Recipe
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecipeVersionSheet({
  recipe,
  open,
  onOpenChange,
}: RecipeVersionSheetProps) {
  const { kitchen, membership, unitsOfMeasure } = useKitchen()
  const uoms = unitsOfMeasure as UOM[]
  const queryClient = useQueryClient()

  const [loading, setLoading] = useState(true)
  const [existingComponents, setExistingComponents] = useState<RecipeComponent[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [showNewVersion, setShowNewVersion] = useState(false)
  const [newComponents, setNewComponents] = useState<ComponentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open || !recipe.current_version_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setShowNewVersion(false)
    setNewComponents([])
    setError(null)

    const supabase = createClient()

    Promise.all([
      supabase
        .from('production_recipe_components')
        .select(
          '*, inventory_items(name), units_of_measure(abbreviation)'
        )
        .eq('recipe_version_id', recipe.current_version_id),
      supabase
        .from('inventory_items')
        .select('id, name')
        .eq('kitchen_id', kitchen.id)
        .eq('is_active', true)
        .order('name'),
    ]).then(([{ data: comps }, { data: items }]) => {
      setExistingComponents((comps ?? []) as RecipeComponent[])
      setInventoryItems((items ?? []) as InventoryItem[])
      setLoading(false)
    })
  }, [open, recipe.current_version_id, kitchen.id])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
  }

  function addNewComponent() {
    setNewComponents((prev) => [
      ...prev,
      { inventory_item_id: '', recipe_quantity: '', uom_id: uoms[0]?.id ?? '' },
    ])
  }

  function removeNewComponent(index: number) {
    setNewComponents((prev) => prev.filter((_, i) => i !== index))
  }

  function updateNewComponent(
    index: number,
    field: keyof ComponentRow,
    value: string
  ) {
    setNewComponents((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    )
  }

  function handleCreateVersion() {
    setError(null)

    const builtComponents = newComponents.filter(
      (c) => c.inventory_item_id && c.recipe_quantity && c.uom_id
    )

    for (const c of builtComponents) {
      if (parseFloat(c.recipe_quantity) <= 0) {
        return setError('All component quantities must be greater than 0.')
      }
    }

    startTransition(async () => {
      try {
        const result = await createRecipeVersion({
          kitchen_id: kitchen.id,
          production_recipe_id: recipe.id,
          created_by: (membership as unknown as { id: string }).id,
          components: builtComponents.map((c) => {
            const qty = parseFloat(c.recipe_quantity)
            return {
              inventory_item_id: c.inventory_item_id,
              recipe_quantity: qty,
              yield_adjusted_quantity: qty,
              uom_id: c.uom_id,
            }
          }),
        })

        if (result instanceof Error) return setError(result.message)

        setShowNewVersion(false)
        setNewComponents([])
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const currentVersion = recipe.production_recipe_versions.find(
    (v) => v.id === recipe.current_version_id
  )

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>{recipe.name} — Versions</SheetTitle>
          <SheetDescription>
            {currentVersion
              ? `Current: v${currentVersion.version_number}`
              : 'No versions yet'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Current Components
                  {currentVersion && ` (v${currentVersion.version_number})`}
                </h3>
                {existingComponents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No components in this version.
                  </p>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Ingredient</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>UOM</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {existingComponents.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>
                              {c.inventory_items?.name ?? c.inventory_item_id}
                            </TableCell>
                            <TableCell>{c.recipe_quantity}</TableCell>
                            <TableCell>
                              {c.units_of_measure?.abbreviation ?? c.uom_id}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {!showNewVersion ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewVersion(true)}
                >
                  <PlusIcon />
                  New Version
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                      New Version Components
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNewComponent}
                    >
                      <PlusIcon />
                      Add
                    </Button>
                  </div>
                  {newComponents.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Click &quot;Add&quot; to add components.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {newComponents.map((comp, i) => (
                        <div
                          key={i}
                          className="rounded-lg border p-3 flex flex-col gap-2"
                        >
                          <FieldGroup>
                            <Field>
                              <FieldLabel>Ingredient</FieldLabel>
                              <Select
                                value={comp.inventory_item_id}
                                onValueChange={(v) =>
                                  updateNewComponent(i, 'inventory_item_id', v)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select ingredient" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {inventoryItems.map((item) => (
                                      <SelectItem key={item.id} value={item.id}>
                                        {item.name}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                            </Field>
                            <div className="grid grid-cols-2 gap-2">
                              <Field>
                                <FieldLabel>Quantity</FieldLabel>
                                <Input
                                  type="number"
                                  min="0.0001"
                                  step="0.0001"
                                  placeholder="0.0000"
                                  value={comp.recipe_quantity}
                                  onChange={(e) =>
                                    updateNewComponent(
                                      i,
                                      'recipe_quantity',
                                      e.target.value
                                    )
                                  }
                                />
                              </Field>
                              <Field>
                                <FieldLabel>UOM</FieldLabel>
                                <Select
                                  value={comp.uom_id}
                                  onValueChange={(v) =>
                                    updateNewComponent(i, 'uom_id', v)
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="UOM" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      {uoms.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                          {u.abbreviation}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              </Field>
                            </div>
                          </FieldGroup>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="self-end text-destructive hover:text-destructive"
                            onClick={() => removeNewComponent(i)}
                          >
                            <TrashIcon />
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {error && <FieldError>{error}</FieldError>}
                </div>
              )}
            </>
          )}
        </div>

        {showNewVersion && (
          <SheetFooter>
            <Button
              onClick={handleCreateVersion}
              disabled={pending}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Save Version
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setShowNewVersion(false)
                setNewComponents([])
                setError(null)
              }}
            >
              Cancel
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
