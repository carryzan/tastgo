'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { createMenuItem } from '../_lib/menu-item-actions'
import { MENU_ITEMS_QUERY_KEY } from '../_lib/queries'
import { mapMenuDbError } from '../_lib/db-errors'
import {
  fetchActiveInventoryItems,
  fetchActiveProductionRecipes,
  type InventoryItemPick,
  type ProductionRecipePick,
} from '../_lib/client-queries'
import type { Menu } from '../_lib/menus'
import { MenuBrandField, useMenuBrandOptions } from './menu-brand-field'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
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

type ComponentType = 'inventory_item' | 'production_recipe'

interface Uom {
  id: string
  name: string
  abbreviation: string
}

interface ComponentRow {
  key: string
  component_type: ComponentType
  inventory_item_id: string
  production_recipe_id: string
  recipe_quantity: string
  uom_id: string
}

interface AddMenuItemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  menus: Menu[]
}

function createComponentRow(defaultUomId: string): ComponentRow {
  return {
    key: crypto.randomUUID(),
    component_type: 'inventory_item',
    inventory_item_id: '',
    production_recipe_id: '',
    recipe_quantity: '',
    uom_id: defaultUomId,
  }
}

export function AddMenuItemSheet({
  open,
  onOpenChange,
  menus,
}: AddMenuItemSheetProps) {
  const { kitchen, unitsOfMeasure } = useKitchen()
  const brands = useMenuBrandOptions()
  const { upload } = useKitchenUpload('menu-items')
  const queryClient = useQueryClient()
  const uoms = unitsOfMeasure as Uom[]

  const [inventoryItems, setInventoryItems] = useState<InventoryItemPick[]>([])
  const [productionRecipes, setProductionRecipes] = useState<
    ProductionRecipePick[]
  >([])
  const [brandOverride, setBrandOverride] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [menuId, setMenuId] = useState('')
  const [price, setPrice] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [components, setComponents] = useState<ComponentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const brandId =
    brandOverride != null && brands.some((brand) => brand.id === brandOverride)
      ? brandOverride
      : brands[0]?.id ?? ''

  const activeMenus = useMemo(
    () => menus.filter((menu) => menu.brand_id === brandId && menu.is_active),
    [menus, brandId]
  )
  const menuIds = useMemo(() => activeMenus.map((menu) => menu.id), [activeMenus])
  const menuLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const menu of activeMenus) map.set(menu.id, menu.name)
    return map
  }, [activeMenus])

  const inventoryIds = useMemo(
    () => inventoryItems.map((item) => item.id),
    [inventoryItems]
  )
  const inventoryLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of inventoryItems) map.set(item.id, item.name)
    return map
  }, [inventoryItems])

  const recipeIds = useMemo(
    () => productionRecipes.map((recipe) => recipe.id),
    [productionRecipes]
  )
  const recipeLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const recipe of productionRecipes) map.set(recipe.id, recipe.name)
    return map
  }, [productionRecipes])

  useEffect(() => {
    if (!open) return

    Promise.all([
      fetchActiveInventoryItems(kitchen.id),
      fetchActiveProductionRecipes(kitchen.id),
    ])
      .then(([inventory, recipes]) => {
        setInventoryItems(inventory)
        setProductionRecipes(recipes)
      })
      .catch(() => setError('Failed to load inventory or recipe data.'))
  }, [open, kitchen.id])

  function resetForm() {
    setBrandOverride(null)
    setName('')
    setMenuId('')
    setPrice('')
    setFile(null)
    setComponents([])
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (pending) return
    if (!next) {
      resetForm()
    }
    onOpenChange(next)
  }

  function addRow() {
    setComponents((current) => [
      ...current,
      createComponentRow(uoms[0]?.id ?? ''),
    ])
  }

  function updateRow(index: number, patch: Partial<ComponentRow>) {
    setComponents((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    )
  }

  function removeRow(index: number) {
    setComponents((current) => current.filter((_, rowIndex) => rowIndex !== index))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!brandId) return setError('Select a brand.')
    if (!name.trim()) return setError('Name is required.')
    if (!menuId) return setError('Select a menu.')

    const menu = activeMenus.find((row) => row.id === menuId)
    if (!menu || menu.brand_id !== brandId) {
      return setError('Select an active menu for this brand.')
    }

    const parsedPrice = Number.parseFloat(price)
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return setError('Enter a valid price (0 or greater).')
    }

    const builtComponents = components
      .filter((component) => {
        if (component.component_type === 'inventory_item') {
          return (
            component.inventory_item_id &&
            component.recipe_quantity &&
            component.uom_id
          )
        }

        return (
          component.production_recipe_id &&
          component.recipe_quantity &&
          component.uom_id
        )
      })
      .map((component) => ({
        component_type: component.component_type,
        inventory_item_id:
          component.component_type === 'inventory_item'
            ? component.inventory_item_id
            : undefined,
        production_recipe_id:
          component.component_type === 'production_recipe'
            ? component.production_recipe_id
            : undefined,
        recipe_quantity: Number.parseFloat(component.recipe_quantity),
        uom_id: component.uom_id,
      }))

    if (builtComponents.length === 0) {
      return setError('Add at least one component before saving the menu item.')
    }

    for (const component of builtComponents) {
      if (
        Number.isNaN(component.recipe_quantity) ||
        component.recipe_quantity <= 0
      ) {
        return setError('All component quantities must be greater than 0.')
      }
    }

    startTransition(async () => {
      try {
        let imageUrl: string | null = null

        if (file) {
          imageUrl = await upload(file)
          if (!imageUrl) {
            return setError(
              'Something went wrong uploading the image. Please try again.'
            )
          }
        }

        const result = await createMenuItem({
          kitchen_id: kitchen.id,
          brand_id: brandId,
          menu_id: menuId,
          name: name.trim(),
          price: parsedPrice,
          image_url: imageUrl,
          components: builtComponents,
        })

        if (result instanceof Error) return setError(mapMenuDbError(result))

        resetForm()
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
          <SheetTitle>Add menu item</SheetTitle>
          <SheetDescription>
            Create a menu item with its first recipe version in one save.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            <FieldGroup>
              <MenuBrandField
                id="add-mi-brand"
                value={brandId}
                onValueChange={(nextBrandId) => {
                  setBrandOverride(nextBrandId)
                  setMenuId('')
                }}
                disabled={pending || brands.length === 0}
              />
              <Field>
                <FieldLabel htmlFor="add-mi-name">Name</FieldLabel>
                <Input
                  id="add-mi-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Item name"
                  disabled={pending}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Menu</FieldLabel>
                <Combobox
                  items={menuIds}
                  value={menuId || null}
                  onValueChange={(nextValue) => setMenuId(nextValue ?? '')}
                  modal
                  itemToStringLabel={(id) =>
                    menuLabelById.get(String(id)) ?? ''
                  }
                >
                  <ComboboxInput
                    placeholder="Select menu"
                    className="w-full"
                  />
                  <ComboboxContent className="z-100 pointer-events-auto">
                    <ComboboxEmpty>No active menus.</ComboboxEmpty>
                    <ComboboxList>
                      {(id: string) => (
                        <ComboboxItem key={id} value={id}>
                          {menuLabelById.get(id) ?? id}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>
              <Field>
                <FieldLabel htmlFor="add-mi-price">Price</FieldLabel>
                <Input
                  id="add-mi-price"
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  disabled={pending}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-mi-image">Image</FieldLabel>
                <Input
                  id="add-mi-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={pending}
                />
                <FieldDescription>Shown in the menu list.</FieldDescription>
              </Field>
            </FieldGroup>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Initial recipe components</h3>
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

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] table-fixed text-sm">
              <colgroup>
                <col className="w-40" />
                <col />
                <col className="w-28" />
                <col className="w-24" />
                <col className="w-12" />
              </colgroup>
              <thead className="bg-background">
                <tr className="border-b">
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
                      className="h-32 px-4 text-center text-muted-foreground"
                    >
                      No components yet. Add at least one ingredient or
                      production recipe before saving.
                    </td>
                  </tr>
                ) : (
                  components.map((component, index) => (
                    <tr key={component.key} className="border-b">
                      <td className="py-1.5 pl-4 pr-2">
                        <Select
                          value={component.component_type}
                          onValueChange={(nextValue) =>
                            updateRow(index, {
                              component_type: nextValue as ComponentType,
                              inventory_item_id: '',
                              production_recipe_id: '',
                            })
                          }
                          disabled={pending}
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
                        {component.component_type === 'inventory_item' ? (
                          <Combobox
                            items={inventoryIds}
                            value={component.inventory_item_id || null}
                            onValueChange={(nextValue) =>
                              updateRow(index, {
                                inventory_item_id: nextValue ?? '',
                              })
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
                              <ComboboxEmpty>No inventory items.</ComboboxEmpty>
                              <ComboboxList>
                                {(id: string) => (
                                  <ComboboxItem key={id} value={id}>
                                    {inventoryLabelById.get(id) ?? id}
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        ) : (
                          <Combobox
                            items={recipeIds}
                            value={component.production_recipe_id || null}
                            onValueChange={(nextValue) =>
                              updateRow(index, {
                                production_recipe_id: nextValue ?? '',
                              })
                            }
                            modal
                            itemToStringLabel={(id) =>
                              recipeLabelById.get(String(id)) ?? ''
                            }
                          >
                            <ComboboxInput
                              placeholder="Production recipe"
                              className="w-full"
                            />
                            <ComboboxContent className="z-100 pointer-events-auto">
                              <ComboboxEmpty>No production recipes.</ComboboxEmpty>
                              <ComboboxList>
                                {(id: string) => (
                                  <ComboboxItem key={id} value={id}>
                                    {recipeLabelById.get(id) ?? id}
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
                          value={component.recipe_quantity}
                          onChange={(e) =>
                            updateRow(index, {
                              recipe_quantity: e.target.value,
                            })
                          }
                          placeholder="0"
                          disabled={pending}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select
                          value={component.uom_id}
                          onValueChange={(nextValue) =>
                            updateRow(index, { uom_id: nextValue })
                          }
                          disabled={pending}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="UOM" />
                          </SelectTrigger>
                          <SelectContent>
                            {uoms.map((uom) => (
                              <SelectItem key={uom.id} value={uom.id}>
                                {uom.abbreviation || uom.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-1.5 pl-1 pr-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => removeRow(index)}
                          disabled={pending}
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>

          {error && <FieldError>{error}</FieldError>}

          <SheetFooter>
            <Button
              type="submit"
              disabled={pending || brands.length === 0 || !brandId}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Add item
            </Button>
            <SheetClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
