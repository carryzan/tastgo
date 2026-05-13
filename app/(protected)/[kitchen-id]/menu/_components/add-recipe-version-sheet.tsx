'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import {
  buildInventoryUomOptions,
  buildProductionRecipeUomOptions,
  defaultUomId,
  fetchInventoryUomConversions,
  fetchProductionRecipeUomConversions,
  type InventoryUomConversion,
  type KitchenUom,
  type ProductionRecipeUomConversion,
} from '@/lib/uom-conversions'
import { createMenuItemRecipeVersion } from '../_lib/menu-item-actions'
import { MENU_ITEMS_QUERY_KEY } from '../_lib/queries'
import { mapMenuDbError } from '../_lib/db-errors'
import {
  fetchActiveInventoryItems,
  fetchActiveProductionRecipes,
  type InventoryItemPick,
  type ProductionRecipePick,
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
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldError } from '@/components/ui/field'

type ComponentType = 'inventory_item' | 'production_recipe'

interface ComponentRow {
  component_type: ComponentType
  inventory_item_id: string
  production_recipe_id: string
  recipe_quantity: string
  uom_id: string
}

interface AddRecipeVersionSheetProps {
  menuItem: MenuItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddRecipeVersionSheet({
  menuItem,
  open,
  onOpenChange,
}: AddRecipeVersionSheetProps) {
  const { kitchen, unitsOfMeasure } = useKitchen()
  const uoms = unitsOfMeasure as KitchenUom[]
  const queryClient = useQueryClient()

  const [inventoryItems, setInventoryItems] = useState<InventoryItemPick[]>([])
  const [productionRecipes, setProductionRecipes] = useState<ProductionRecipePick[]>([])
  const [inventoryUomConversions, setInventoryUomConversions] = useState<InventoryUomConversion[]>([])
  const [productionUomConversions, setProductionUomConversions] = useState<ProductionRecipeUomConversion[]>([])
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    Promise.all([
      fetchActiveInventoryItems(kitchen.id),
      fetchActiveProductionRecipes(kitchen.id),
      fetchInventoryUomConversions(kitchen.id),
      fetchProductionRecipeUomConversions(kitchen.id),
    ])
      .then(([inv, recipes, inventoryConversions, productionConversions]) => {
        setInventoryItems(inv)
        setProductionRecipes(recipes)
        setInventoryUomConversions(inventoryConversions)
        setProductionUomConversions(productionConversions)
      })
      .catch(() => setError('Failed to load inventory or recipe data.'))
  }, [open, kitchen.id])

  const inventoryIds = useMemo(
    () => inventoryItems.map((i) => i.id),
    [inventoryItems]
  )
  const inventoryLabelById = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of inventoryItems) m.set(i.id, i.name)
    return m
  }, [inventoryItems])

  const recipeIds = useMemo(
    () => productionRecipes.map((r) => r.id),
    [productionRecipes]
  )
  const recipeLabelById = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of productionRecipes) m.set(r.id, r.name)
    return m
  }, [productionRecipes])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setComponents([])
    }
  }

  function addRow() {
    setComponents((prev) => [
      ...prev,
      {
        component_type: 'inventory_item',
        inventory_item_id: '',
        production_recipe_id: '',
        recipe_quantity: '',
        uom_id: '',
      },
    ])
  }

  function removeRow(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index))
  }

  function updateRow(index: number, patch: Partial<ComponentRow>) {
    setComponents((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    )
  }

  function handleSubmit() {
    setError(null)

    const built = components.filter((c) => {
      if (c.component_type === 'inventory_item') {
        return c.inventory_item_id && c.recipe_quantity && c.uom_id
      }
      return c.production_recipe_id && c.recipe_quantity && c.uom_id
    })

    if (built.length === 0) {
      return setError('Add at least one component before saving the recipe version.')
    }

    for (const c of built) {
      const qty = Number.parseFloat(c.recipe_quantity)
      if (Number.isNaN(qty) || qty <= 0) {
        return setError('All component quantities must be greater than 0.')
      }
    }

    startTransition(async () => {
      try {
        const result = await createMenuItemRecipeVersion({
          kitchen_id: kitchen.id,
          menu_item_id: menuItem.id,
          components: built.map((c) => {
            const qty = Number.parseFloat(c.recipe_quantity)
            if (c.component_type === 'inventory_item') {
              return {
                component_type: 'inventory_item' as const,
                inventory_item_id: c.inventory_item_id,
                recipe_quantity: qty,
                uom_id: c.uom_id,
              }
            }
            return {
              component_type: 'production_recipe' as const,
              production_recipe_id: c.production_recipe_id,
              recipe_quantity: qty,
              uom_id: c.uom_id,
            }
          }),
        })

        if (result instanceof Error) return setError(mapMenuDbError(result))

        setComponents([])
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
          <SheetTitle>New Version — {menuItem.name}</SheetTitle>
          <SheetDescription>
            Creates a new version and sets it as the current recipe.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-medium">Components</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={pending}
            >
              <PlusIcon />
              Add row
            </Button>
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[640px] table-fixed text-sm">
              <colgroup>
                <col className="w-36" />
                <col />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-12" />
              </colgroup>
              <thead className="sticky top-0 bg-popover">
                <tr className="border-y">
                  <th className="py-2 pl-4 pr-2 text-left font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Source
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
                      colSpan={5}
                      className="py-8 pl-4 text-center text-sm text-muted-foreground"
                    >
                      Add rows for inventory ingredients or production recipes.
                    </td>
                  </tr>
                ) : (
                  components.map((comp, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-1.5 pl-4 pr-2">
                        <Select
                          value={comp.component_type}
                          onValueChange={(v) =>
                            updateRow(i, {
                              component_type: v as ComponentType,
                              inventory_item_id: '',
                              production_recipe_id: '',
                              uom_id: '',
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inventory_item">
                              Inventory item
                            </SelectItem>
                            <SelectItem value="production_recipe">
                              Production recipe
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        {comp.component_type === 'inventory_item' ? (
                          <Combobox
                            items={inventoryIds}
                            value={comp.inventory_item_id || null}
                            onValueChange={(next) =>
                              {
                                const inventoryItem =
                                  inventoryItems.find((item) => item.id === next) ?? null
                                updateRow(i, {
                                  inventory_item_id: next ?? '',
                                  uom_id: defaultUomId(
                                    buildInventoryUomOptions(
                                      inventoryItem,
                                      inventoryUomConversions,
                                      uoms,
                                      'recipe'
                                    )
                                  ),
                                })
                              }
                            }
                            modal
                            itemToStringLabel={(id) =>
                              inventoryLabelById.get(String(id)) ?? ''
                            }
                          >
                            <ComboboxInput
                              placeholder="Ingredient"
                              className="w-full"
                            />
                            <ComboboxContent className="z-100 pointer-events-auto">
                              <ComboboxEmpty>No items found.</ComboboxEmpty>
                              <ComboboxList>
                                {(item: string) => (
                                  <ComboboxItem key={item} value={item}>
                                    {inventoryLabelById.get(item) ?? item}
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        ) : (
                          <Combobox
                            items={recipeIds}
                            value={comp.production_recipe_id || null}
                            onValueChange={(next) =>
                              {
                                const productionRecipe =
                                  productionRecipes.find((recipe) => recipe.id === next) ?? null
                                updateRow(i, {
                                  production_recipe_id: next ?? '',
                                  uom_id: defaultUomId(
                                    buildProductionRecipeUomOptions(
                                      productionRecipe,
                                      productionUomConversions,
                                      uoms,
                                      'recipe'
                                    )
                                  ),
                                })
                              }
                            }
                            modal
                            itemToStringLabel={(id) =>
                              recipeLabelById.get(String(id)) ?? ''
                            }
                          >
                            <ComboboxInput
                              placeholder="Recipe"
                              className="w-full"
                            />
                            <ComboboxContent className="z-100 pointer-events-auto">
                              <ComboboxEmpty>No recipes found.</ComboboxEmpty>
                              <ComboboxList>
                                {(item: string) => (
                                  <ComboboxItem key={item} value={item}>
                                    {recipeLabelById.get(item) ?? item}
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={comp.recipe_quantity}
                          onChange={(e) =>
                            updateRow(i, { recipe_quantity: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        {(() => {
                          const uomOptions =
                            comp.component_type === 'inventory_item'
                              ? buildInventoryUomOptions(
                                  inventoryItems.find((item) => item.id === comp.inventory_item_id),
                                  inventoryUomConversions,
                                  uoms,
                                  'recipe'
                                )
                              : buildProductionRecipeUomOptions(
                                  productionRecipes.find((recipe) => recipe.id === comp.production_recipe_id),
                                  productionUomConversions,
                                  uoms,
                                  'recipe'
                                )
                          return (
                        <Select
                          value={comp.uom_id}
                          onValueChange={(v) => updateRow(i, { uom_id: v })}
                          disabled={uomOptions.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="UOM" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {uomOptions.map((u) => (
                                <SelectItem key={u.uom_id} value={u.uom_id}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                          )
                        })()}
                      </td>
                      <td className="py-1.5 pl-1 pr-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeRow(i)}
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
            Save version
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
