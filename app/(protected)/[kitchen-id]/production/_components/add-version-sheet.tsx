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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldError } from '@/components/ui/field'

interface InventoryItem {
  id: string
  name: string
}

interface UOM {
  id: string
  name: string
  abbreviation: string
}

interface ComponentRow {
  inventory_item_id: string
  recipe_quantity: string
  uom_id: string
}

interface AddVersionSheetProps {
  recipe: Recipe
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddVersionSheet({
  recipe,
  open,
  onOpenChange,
}: AddVersionSheetProps) {
  const { kitchen, membership, unitsOfMeasure } = useKitchen()
  const uoms = unitsOfMeasure as UOM[]
  const queryClient = useQueryClient()

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('inventory_items')
      .select('id, name')
      .eq('kitchen_id', kitchen.id)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setInventoryItems((data ?? []) as InventoryItem[]))
  }, [open, kitchen.id])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setComponents([])
    }
  }

  function addIngredient() {
    setComponents((prev) => [
      ...prev,
      { inventory_item_id: '', recipe_quantity: '', uom_id: uoms[0]?.id ?? '' },
    ])
  }

  function removeIngredient(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index))
  }

  function updateIngredient(index: number, field: keyof ComponentRow, value: string) {
    setComponents((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    )
  }

  function handleSubmit() {
    setError(null)

    const builtComponents = components.filter(
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

        setComponents([])
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const nextVersionNumber =
    recipe.production_recipe_versions.length > 0
      ? Math.max(...recipe.production_recipe_versions.map((v) => v.version_number)) + 1
      : 1

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
          <SheetTitle>New Version — {recipe.name}</SheetTitle>
          <SheetDescription>
            This will create Version {nextVersionNumber} and set it as the current version.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-medium">Ingredients</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
              disabled={pending}
            >
              <PlusIcon />
              Add Ingredient
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-24" />
                <col className="w-20" />
                <col className="w-12" />
              </colgroup>
              <thead className="sticky top-0 bg-popover">
                <tr className="border-y">
                  <th className="py-2 pl-4 pr-2 text-left font-medium text-muted-foreground">
                    Ingredient
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Qty
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    UOM
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {components.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 pl-4 text-center text-sm text-muted-foreground"
                    >
                      Click &quot;Add Ingredient&quot; to get started.
                    </td>
                  </tr>
                ) : (
                  components.map((comp, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-1.5 pl-4 pr-2">
                        <Select
                          value={comp.inventory_item_id}
                          onValueChange={(v) =>
                            updateIngredient(i, 'inventory_item_id', v)
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
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={comp.recipe_quantity}
                          onChange={(e) =>
                            updateIngredient(i, 'recipe_quantity', e.target.value)
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select
                          value={comp.uom_id}
                          onValueChange={(v) => updateIngredient(i, 'uom_id', v)}
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
                      </td>
                      <td className="py-1.5 pl-1 pr-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeIngredient(i)}
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
            Save Version
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
