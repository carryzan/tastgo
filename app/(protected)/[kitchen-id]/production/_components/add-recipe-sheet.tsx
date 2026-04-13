'use client'

import { useState, useTransition, useEffect } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { createClient } from '@/lib/supabase/client'
import { createRecipe } from '../_lib/recipe-actions'
import { RECIPES_QUERY_KEY } from '../_lib/queries'
import { RecipeForm, parseRecipeFormValues } from './recipe-form'
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
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'

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

interface AddRecipeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddRecipeSheet({ open, onOpenChange }: AddRecipeSheetProps) {
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

  function addComponent() {
    setComponents((prev) => [
      ...prev,
      {
        inventory_item_id: '',
        recipe_quantity: '',
        uom_id: uoms[0]?.id ?? '',
      },
    ])
  }

  function removeComponent(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index))
  }

  function updateComponent(
    index: number,
    field: keyof ComponentRow,
    value: string
  ) {
    setComponents((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const values = parseRecipeFormValues(form)

    if (!values.name) return

    const builtComponents = components.filter(
      (c) => c.inventory_item_id && c.recipe_quantity && c.uom_id
    )

    for (const c of builtComponents) {
      const qty = parseFloat(c.recipe_quantity)
      if (qty <= 0) return setError('All component quantities must be greater than 0.')
    }

    startTransition(async () => {
      try {
        const result = await createRecipe({
          kitchen_id: kitchen.id,
          name: values.name,
          track_stock: values.track_stock,
          variance_tolerance_percentage: values.variance_tolerance_percentage,
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

        form.reset()
        setComponents([])
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

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
          <SheetTitle>Add Recipe</SheetTitle>
          <SheetDescription>
            Create a new production recipe with its initial version and
            components.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <RecipeForm error={null}>
            <div className="px-4 pb-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">Components</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addComponent}
                >
                  <PlusIcon />
                  Add Component
                </Button>
              </div>
              {components.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No components added. Click &quot;Add Component&quot; to add
                  ingredients.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {components.map((comp, i) => (
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
                              updateComponent(i, 'inventory_item_id', v)
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
                                updateComponent(
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
                                updateComponent(i, 'uom_id', v)
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
                        onClick={() => removeComponent(i)}
                      >
                        <TrashIcon />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {error && (
              <div className="px-4 pb-2">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
            <SheetFooter>
              <Button type="submit" disabled={pending} className="min-w-28">
                {pending && <Spinner data-icon="inline-start" />}
                Add Recipe
              </Button>
              <SheetClose asChild>
                <Button variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </RecipeForm>
        </form>
      </SheetContent>
    </Sheet>
  )
}
