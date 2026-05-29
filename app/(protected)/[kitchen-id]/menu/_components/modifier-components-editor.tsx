'use client'

import { PlusIcon, TrashIcon } from 'lucide-react'
import {
  buildInventoryUomOptions,
  buildProductionRecipeUomOptions,
  defaultUomId,
  type InventoryUomConversion,
  type KitchenUom,
  type ProductionRecipeUomConversion,
} from '@/lib/uom-conversions'
import type {
  InventoryItemBasicPick,
  ProductionRecipePick,
} from '../_lib/client-queries'
import type {
  ModifierComponentDirection,
  ModifierComponentType,
} from '../_lib/modifier-option-actions'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface LocalModifierComponent {
  key: string
  direction: ModifierComponentDirection
  component_type: ModifierComponentType
  inventory_item_id: string
  production_recipe_id: string
  quantity: string
  uom_id: string
  sort_order: number
}

export function createLocalModifierComponent(
  direction: ModifierComponentDirection
): LocalModifierComponent {
  return {
    key: crypto.randomUUID(),
    direction,
    component_type: 'inventory_item',
    inventory_item_id: '',
    production_recipe_id: '',
    quantity: '',
    uom_id: '',
    sort_order: 0,
  }
}

interface ModifierComponentsEditorProps {
  components: LocalModifierComponent[]
  onChange: (components: LocalModifierComponent[]) => void
  inventoryItems: InventoryItemBasicPick[]
  productionRecipes: ProductionRecipePick[]
  inventoryUomConversions: InventoryUomConversion[]
  productionUomConversions: ProductionRecipeUomConversion[]
  uoms: KitchenUom[]
  disabled?: boolean
}

export function ModifierComponentsEditor({
  components,
  onChange,
  inventoryItems,
  productionRecipes,
  inventoryUomConversions,
  productionUomConversions,
  uoms,
  disabled,
}: ModifierComponentsEditorProps) {
  const inventoryIds = inventoryItems.map((item) => item.id)
  const productionRecipeIds = productionRecipes.map((recipe) => recipe.id)
  const inventoryLabelById = new Map(inventoryItems.map((item) => [item.id, item.name]))
  const recipeLabelById = new Map(productionRecipes.map((recipe) => [recipe.id, recipe.name]))

  function updateComponent(index: number, patch: Partial<LocalModifierComponent>) {
    onChange(
      components.map((component, componentIndex) =>
        componentIndex === index ? { ...component, ...patch } : component
      )
    )
  }

  function componentUomOptions(component: LocalModifierComponent) {
    if (component.component_type === 'inventory_item') {
      return buildInventoryUomOptions(
        inventoryItems.find((item) => item.id === component.inventory_item_id),
        inventoryUomConversions,
        uoms,
        'modifier'
      )
    }

    return buildProductionRecipeUomOptions(
      productionRecipes.find((recipe) => recipe.id === component.production_recipe_id),
      productionUomConversions,
      uoms,
      'modifier'
    )
  }

  function defaultComponentUomId(component: LocalModifierComponent) {
    return defaultUomId(componentUomOptions(component))
  }

  function addComponent(direction: ModifierComponentDirection) {
    onChange(
      [...components, createLocalModifierComponent(direction)].map(
        (component, index) => ({ ...component, sort_order: index })
      )
    )
  }

  function removeComponent(index: number) {
    onChange(
      components
        .filter((_, componentIndex) => componentIndex !== index)
        .map((component, nextIndex) => ({ ...component, sort_order: nextIndex }))
    )
  }

  return (
    <div className="grid gap-2">
      {components.length === 0 ? (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          No stock components.
        </div>
      ) : (
        components.map((component, index) => (
          <div key={component.key} className="grid gap-2 rounded-md border p-2">
            <div className="grid gap-2 md:grid-cols-[6.5rem_7rem_minmax(10rem,1fr)_5rem_6rem_2rem]">
              <Select
                value={component.direction}
                onValueChange={(value) =>
                  updateComponent(index, {
                    direction: value as ModifierComponentDirection,
                    quantity: value === 'add' ? component.quantity : '',
                    uom_id: value === 'add' ? component.uom_id : '',
                  })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add</SelectItem>
                  <SelectItem value="remove">Remove</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={component.component_type}
                onValueChange={(value) => {
                  const nextComponent = {
                    ...component,
                    component_type: value as ModifierComponentType,
                    inventory_item_id: '',
                    production_recipe_id: '',
                  }
                  updateComponent(index, {
                    component_type: nextComponent.component_type,
                    inventory_item_id: '',
                    production_recipe_id: '',
                    uom_id:
                      component.direction === 'add'
                        ? defaultComponentUomId(nextComponent)
                        : '',
                  })
                }}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory_item">Inventory</SelectItem>
                  <SelectItem value="production_recipe">Recipe</SelectItem>
                </SelectContent>
              </Select>

              {component.component_type === 'production_recipe' ? (
                <Combobox
                  items={productionRecipeIds}
                  value={component.production_recipe_id || null}
                  onValueChange={(nextValue) => {
                    const nextComponent = {
                      ...component,
                      production_recipe_id: nextValue ?? '',
                    }
                    updateComponent(index, {
                      production_recipe_id: nextValue ?? '',
                      uom_id:
                        component.direction === 'add'
                          ? defaultComponentUomId(nextComponent)
                          : '',
                    })
                  }}
                  modal
                  itemToStringLabel={(id) => recipeLabelById.get(String(id)) ?? ''}
                >
                  <ComboboxInput placeholder="Recipe" className="w-full" />
                  <ComboboxContent className="z-100 pointer-events-auto">
                    <ComboboxEmpty>No recipes.</ComboboxEmpty>
                    <ComboboxList>
                      {(id: string) => (
                        <ComboboxItem key={id} value={id}>
                          {recipeLabelById.get(id) ?? id}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              ) : (
                <Combobox
                  items={inventoryIds}
                  value={component.inventory_item_id || null}
                  onValueChange={(nextValue) => {
                    const nextComponent = {
                      ...component,
                      inventory_item_id: nextValue ?? '',
                    }
                    updateComponent(index, {
                      inventory_item_id: nextValue ?? '',
                      uom_id:
                        component.direction === 'add'
                          ? defaultComponentUomId(nextComponent)
                          : '',
                    })
                  }}
                  modal
                  itemToStringLabel={(id) => inventoryLabelById.get(String(id)) ?? ''}
                >
                  <ComboboxInput placeholder="Inventory item" className="w-full" />
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
              )}

              {component.direction === 'add' ? (
                <Input
                  value={component.quantity}
                  onChange={(event) =>
                    updateComponent(index, { quantity: event.target.value })
                  }
                  inputMode="decimal"
                  placeholder="Qty"
                  disabled={disabled}
                />
              ) : (
                <div className="flex h-9 items-center px-2 text-xs text-muted-foreground">
                  -
                </div>
              )}

              {component.direction === 'add' ? (
                <Select
                  value={component.uom_id || undefined}
                  onValueChange={(value) => updateComponent(index, { uom_id: value })}
                  disabled={disabled || componentUomOptions(component).length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="UOM" />
                  </SelectTrigger>
                  <SelectContent>
                    {componentUomOptions(component).map((uom) => (
                      <SelectItem key={uom.uom_id} value={uom.uom_id}>
                        {uom.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-9 items-center px-2 text-xs text-muted-foreground">
                  -
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:text-destructive"
                onClick={() => removeComponent(index)}
                disabled={disabled}
                aria-label="Remove component"
              >
                <TrashIcon />
              </Button>
            </div>
          </div>
        ))
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addComponent('add')}
          disabled={disabled}
        >
          <PlusIcon />
          Add stock
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addComponent('remove')}
          disabled={disabled}
        >
          <PlusIcon />
          Remove stock
        </Button>
      </div>
    </div>
  )
}
