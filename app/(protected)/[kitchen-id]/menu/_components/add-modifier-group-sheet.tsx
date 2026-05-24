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
import {
  createModifierGroup,
  saveModifierGroupPortions,
} from '../_lib/modifier-group-actions'
import { MODIFIER_GROUPS_QUERY_KEY } from '../_lib/queries'
import { mapMenuDbError } from '../_lib/db-errors'
import {
  fetchActiveInventoryItemPicks,
  fetchActiveProductionRecipes,
  fetchModifierPortions,
  type InventoryItemBasicPick,
  type ModifierPortionPick,
  type ProductionRecipePick,
} from '../_lib/client-queries'
import type {
  ModifierComponentType,
  ModifierOptionType,
  ModifierPricePortionBehavior,
} from '../_lib/modifier-option-actions'
import { MenuBrandField, useMenuBrandOptions } from './menu-brand-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

interface LocalOption {
  key: string
  name: string
  type: ModifierOptionType
  component_type: ModifierComponentType | 'none'
  inventory_item_id: string
  production_recipe_id: string
  removed_component_type: ModifierComponentType | 'none'
  removed_inventory_item_id: string
  removed_production_recipe_id: string
  quantity: string
  uom_id: string
  price_charge: string
  is_active: boolean
  is_default: boolean
  price_portion_behavior: ModifierPricePortionBehavior
}

interface AddModifierGroupSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
}

const OPTION_TYPES: ModifierOptionType[] = [
  'addition',
  'removal',
  'substitution',
  'neutral',
]

function createOption(): LocalOption {
  return {
    key: crypto.randomUUID(),
    name: '',
    type: 'neutral',
    component_type: 'none',
    inventory_item_id: '',
    production_recipe_id: '',
    removed_component_type: 'none',
    removed_inventory_item_id: '',
    removed_production_recipe_id: '',
    quantity: '',
    uom_id: '',
    price_charge: '0',
    is_active: true,
    is_default: false,
    price_portion_behavior: 'scale_with_portion',
  }
}

export function AddModifierGroupSheet({
  open,
  onOpenChange,
  kitchenId,
}: AddModifierGroupSheetProps) {
  const { unitsOfMeasure } = useKitchen()
  const uoms = unitsOfMeasure as KitchenUom[]
  const brands = useMenuBrandOptions()
  const queryClient = useQueryClient()

  const [inventoryItems, setInventoryItems] = useState<InventoryItemBasicPick[]>([])
  const [productionRecipes, setProductionRecipes] = useState<ProductionRecipePick[]>([])
  const [modifierPortions, setModifierPortions] = useState<ModifierPortionPick[]>(
    []
  )
  const [uomConversions, setUomConversions] = useState<InventoryUomConversion[]>([])
  const [productionUomConversions, setProductionUomConversions] = useState<
    ProductionRecipeUomConversion[]
  >([])
  const [brandOverride, setBrandOverride] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [minSelections, setMinSelections] = useState('0')
  const [maxSelections, setMaxSelections] = useState('')
  const [selectedPortionIds, setSelectedPortionIds] = useState<Set<string>>(
    new Set()
  )
  const [defaultPortionId, setDefaultPortionId] = useState('')
  const [options, setOptions] = useState<LocalOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const brandId =
    brandOverride != null && brands.some((brand) => brand.id === brandOverride)
      ? brandOverride
      : brands[0]?.id ?? ''

  const inventoryIds = useMemo(
    () => inventoryItems.map((item) => item.id),
    [inventoryItems]
  )
  const inventoryLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of inventoryItems) map.set(item.id, item.name)
    return map
  }, [inventoryItems])
  const productionRecipeIds = useMemo(
    () => productionRecipes.map((recipe) => recipe.id),
    [productionRecipes]
  )
  const productionRecipeLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const recipe of productionRecipes) map.set(recipe.id, recipe.name)
    return map
  }, [productionRecipes])

  useEffect(() => {
    if (!open) return

    Promise.all([
      fetchActiveInventoryItemPicks(kitchenId),
      fetchActiveProductionRecipes(kitchenId),
      fetchInventoryUomConversions(kitchenId),
      fetchProductionRecipeUomConversions(kitchenId),
      fetchModifierPortions(kitchenId),
    ])
      .then(([items, recipes, conversions, productionConversions, portions]) => {
        setInventoryItems(items)
        setProductionRecipes(recipes)
        setUomConversions(conversions)
        setProductionUomConversions(productionConversions)
        setModifierPortions(portions)
      })
      .catch(() => setError('Failed to load modifier setup data.'))
  }, [open, kitchenId])

  function resetForm() {
    setBrandOverride(null)
    setName('')
    setMinSelections('0')
    setMaxSelections('')
    setSelectedPortionIds(new Set())
    setDefaultPortionId('')
    setOptions([])
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (pending) return
    if (!next) resetForm()
    onOpenChange(next)
  }

  function updateOption(index: number, patch: Partial<LocalOption>) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option
      )
    )
  }

  function optionUomOptions(option: LocalOption) {
    if (option.component_type === 'inventory_item') {
      return buildInventoryUomOptions(
        inventoryItems.find((item) => item.id === option.inventory_item_id),
        uomConversions,
        uoms,
        'modifier'
      )
    }

    if (option.component_type === 'production_recipe') {
      return buildProductionRecipeUomOptions(
        productionRecipes.find((recipe) => recipe.id === option.production_recipe_id),
        productionUomConversions,
        uoms,
        'modifier'
      )
    }

    return []
  }

  function defaultModifierUomId(option: LocalOption) {
    return defaultUomId(optionUomOptions(option))
  }

  function removeOption(index: number) {
    setOptions((current) =>
      current.filter((_, optionIndex) => optionIndex !== index)
    )
  }

  function togglePortion(portionId: string, checked: boolean) {
    setSelectedPortionIds((current) => {
      const next = new Set(current)
      if (checked) next.add(portionId)
      else next.delete(portionId)
      if (!next.has(defaultPortionId)) {
        setDefaultPortionId(next.values().next().value ?? '')
      }
      return next
    })
  }

  function validateOptions(): string | null {
    if (options.length === 0) {
      return 'Add at least one active option before saving the group.'
    }

    for (const option of options) {
      if (!option.name.trim()) return 'Each option needs a name.'

      const priceCharge = Number.parseFloat(option.price_charge)
      if (Number.isNaN(priceCharge) || priceCharge < 0) {
        return 'Option prices must be 0 or greater.'
      }

      if (option.type === 'addition' || option.type === 'substitution') {
        const quantity = Number.parseFloat(option.quantity)
        if (option.quantity.trim() === '' || Number.isNaN(quantity) || quantity <= 0) {
          return `Option "${option.name || 'Untitled'}": quantity is required for ${option.type} type.`
        }
        if (option.component_type === 'none') {
          return `Option "${option.name || 'Untitled'}": select an added component for ${option.type} type.`
        }
        if (
          option.component_type === 'inventory_item' &&
          !option.inventory_item_id
        ) {
          return `Option "${option.name || 'Untitled'}": select an inventory item for ${option.type} type.`
        }
        if (
          option.component_type === 'production_recipe' &&
          !option.production_recipe_id
        ) {
          return `Option "${option.name || 'Untitled'}": select a production recipe for ${option.type} type.`
        }
        if (!option.uom_id) {
          return `Option "${option.name || 'Untitled'}": configure and select a modifier UOM.`
        }
      }

      if (option.type === 'removal' || option.type === 'substitution') {
        if (option.removed_component_type === 'none') {
          return `Option "${option.name || 'Untitled'}": select the component being removed for ${option.type} type.`
        }
        if (
          option.removed_component_type === 'inventory_item' &&
          !option.removed_inventory_item_id
        ) {
          return `Option "${option.name || 'Untitled'}": select the inventory item being removed for ${option.type} type.`
        }
        if (
          option.removed_component_type === 'production_recipe' &&
          !option.removed_production_recipe_id
        ) {
          return `Option "${option.name || 'Untitled'}": select the production recipe being removed for ${option.type} type.`
        }
      }
    }

    if (!options.some((option) => option.is_active)) {
      return 'Add at least one active option before saving the group.'
    }

    return null
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!brandId) return setError('Select a brand.')
    if (!name.trim()) return setError('Name is required.')

    const parsedMinSelections = Number.parseInt(minSelections, 10)
    if (Number.isNaN(parsedMinSelections) || parsedMinSelections < 0) {
      return setError('Min selections must be 0 or greater.')
    }

    let parsedMaxSelections: number | null = null
    if (maxSelections.trim() !== '') {
      parsedMaxSelections = Number.parseInt(maxSelections, 10)
      if (Number.isNaN(parsedMaxSelections)) {
        return setError('Max selections must be a whole number or empty.')
      }
      if (parsedMaxSelections < parsedMinSelections) {
        return setError(
          'Max selections must be empty or greater than or equal to min selections.'
        )
      }
    }

    const optionsError = validateOptions()
    if (optionsError) return setError(optionsError)

    startTransition(async () => {
      try {
        const result = await createModifierGroup({
          kitchen_id: kitchenId,
          brand_id: brandId,
          name: name.trim(),
          min_selections: parsedMinSelections,
          max_selections: parsedMaxSelections,
          options: options.map((option) => ({
            name: option.name.trim(),
            type: option.type,
            component_type:
              option.component_type === 'none' ? null : option.component_type,
            inventory_item_id:
              option.component_type === 'inventory_item'
                ? option.inventory_item_id || null
                : null,
            production_recipe_id:
              option.component_type === 'production_recipe'
                ? option.production_recipe_id || null
                : null,
            removed_component_type:
              option.removed_component_type === 'none'
                ? null
                : option.removed_component_type,
            removed_inventory_item_id:
              option.removed_component_type === 'inventory_item'
                ? option.removed_inventory_item_id || null
                : null,
            removed_production_recipe_id:
              option.removed_component_type === 'production_recipe'
                ? option.removed_production_recipe_id || null
                : null,
            quantity:
              option.quantity.trim() === ''
                ? null
                : Number.parseFloat(option.quantity),
            uom_id: option.uom_id || null,
            price_charge: Number.parseFloat(option.price_charge),
            is_active: option.is_active,
            is_default: option.is_default,
            price_portion_behavior: option.price_portion_behavior,
          })),
        })

        if (result instanceof Error) return setError(mapMenuDbError(result))

        const selectedPortions = Array.from(selectedPortionIds)
        if (selectedPortions.length > 0) {
          const effectiveDefaultPortionId = selectedPortions.includes(defaultPortionId)
            ? defaultPortionId
            : selectedPortions[0]
          const portionResult = await saveModifierGroupPortions(
            result,
            kitchenId,
            selectedPortions.map((portionId, index) => ({
              portion_id: portionId,
              is_default: portionId === effectiveDefaultPortionId,
              sort_order: index,
            }))
          )
          if (portionResult instanceof Error) {
            return setError(mapMenuDbError(portionResult))
          }
        }

        resetForm()
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: MODIFIER_GROUPS_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="sm:max-w-6xl"
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>Add modifier group</SheetTitle>
          <SheetDescription>
            Create a reusable modifier group with its initial options.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            <FieldGroup>
              <MenuBrandField
                id="add-mg-brand"
                value={brandId}
                onValueChange={setBrandOverride}
                disabled={pending || brands.length === 0}
              />
              <Field>
                <FieldLabel htmlFor="add-mg-name">Name</FieldLabel>
                <Input
                  id="add-mg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Size"
                  disabled={pending}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-mg-min">Min selections</FieldLabel>
                <Input
                  id="add-mg-min"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={minSelections}
                  onChange={(e) => setMinSelections(e.target.value)}
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-mg-max">Max selections</FieldLabel>
                <Input
                  id="add-mg-max"
                  type="number"
                  inputMode="numeric"
                  value={maxSelections}
                  onChange={(e) => setMaxSelections(e.target.value)}
                  placeholder="Unlimited"
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel>Portions</FieldLabel>
                <div className="grid gap-2 rounded-md border p-3">
                  {modifierPortions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No portions are available.
                    </p>
                  ) : (
                    modifierPortions.map((portion) => {
                      const selected = selectedPortionIds.has(portion.id)
                      return (
                        <label
                          key={portion.id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span>
                            {portion.name}{' '}
                            <span className="text-muted-foreground">
                              x{Number(portion.multiplier).toLocaleString()}
                            </span>
                          </span>
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) =>
                              togglePortion(portion.id, checked === true)
                            }
                            disabled={pending}
                          />
                        </label>
                      )
                    })
                  )}
                </div>
              </Field>
              {selectedPortionIds.size > 0 && (
                <Field>
                  <FieldLabel>Default portion</FieldLabel>
                  <Select
                    value={defaultPortionId || undefined}
                    onValueChange={setDefaultPortionId}
                    disabled={pending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select default" />
                    </SelectTrigger>
                    <SelectContent>
                      {modifierPortions
                        .filter((portion) => selectedPortionIds.has(portion.id))
                        .map((portion) => (
                          <SelectItem key={portion.id} value={portion.id}>
                            {portion.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </FieldGroup>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Options</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOptions((current) => [...current, createOption()])}
              disabled={pending}
            >
              <PlusIcon />
              Add option
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[1180px] table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-32" />
                <col />
                <col />
                <col className="w-20" />
                <col className="w-24" />
                <col className="w-24" />
                <col className="w-28" />
                <col className="w-20" />
                <col className="w-16" />
                <col className="w-12" />
              </colgroup>
              <thead className="bg-background">
                <tr className="border-b">
                  <th className="py-2 pl-4 pr-2 text-left font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Item
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Removed
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Qty
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    UOM
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Price
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Portion
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Default
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    On
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {options.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="h-32 px-4 text-center text-muted-foreground"
                    >
                      No options yet. Add at least one active option before
                      saving.
                    </td>
                  </tr>
                ) : (
                  options.map((option, index) => (
                    <tr key={option.key} className="border-b">
                      <td className="py-1.5 pl-4 pr-2">
                        <Input
                          value={option.name}
                          onChange={(e) =>
                            updateOption(index, { name: e.target.value })
                          }
                          placeholder="Name"
                          disabled={pending}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select
                          value={option.type}
                          onValueChange={(nextValue) =>
                            updateOption(index, {
                              type: nextValue as ModifierOptionType,
                              component_type:
                                nextValue === 'addition' ||
                                nextValue === 'substitution'
                                  ? option.component_type === 'none'
                                    ? 'inventory_item'
                                    : option.component_type
                                  : 'none',
                              inventory_item_id:
                                nextValue === 'addition' ||
                                nextValue === 'substitution'
                                  ? option.inventory_item_id
                                  : '',
                              production_recipe_id:
                                nextValue === 'addition' ||
                                nextValue === 'substitution'
                                  ? option.production_recipe_id
                                  : '',
                              uom_id:
                                nextValue === 'addition' ||
                                nextValue === 'substitution'
                                  ? option.uom_id
                                  : '',
                              removed_component_type:
                                nextValue === 'removal' ||
                                nextValue === 'substitution'
                                  ? option.removed_component_type === 'none'
                                    ? 'inventory_item'
                                    : option.removed_component_type
                                  : 'none',
                              removed_inventory_item_id:
                                nextValue === 'removal' ||
                                nextValue === 'substitution'
                                  ? option.removed_inventory_item_id
                                  : '',
                              removed_production_recipe_id:
                                nextValue === 'removal' ||
                                nextValue === 'substitution'
                                  ? option.removed_production_recipe_id
                                  : '',
                            })
                          }
                          disabled={pending}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPTION_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        {option.type === 'addition' ||
                        option.type === 'substitution' ? (
                          <div className="grid gap-1">
                            <Select
                              value={option.component_type}
                              onValueChange={(nextType) => {
                                const componentType = nextType as ModifierComponentType
                                const nextOption = {
                                  ...option,
                                  component_type: componentType,
                                  inventory_item_id: '',
                                  production_recipe_id: '',
                                }
                                updateOption(index, {
                                  component_type: componentType,
                                  inventory_item_id: '',
                                  production_recipe_id: '',
                                  uom_id: defaultModifierUomId(nextOption),
                                })
                              }}
                              disabled={pending}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inventory_item">Inventory</SelectItem>
                                <SelectItem value="production_recipe">Recipe</SelectItem>
                              </SelectContent>
                            </Select>
                            {option.component_type === 'production_recipe' ? (
                              <Combobox
                                items={productionRecipeIds}
                                value={option.production_recipe_id || null}
                                onValueChange={(nextValue) => {
                                  const nextOption = {
                                    ...option,
                                    production_recipe_id: nextValue ?? '',
                                  }
                                  updateOption(index, {
                                    production_recipe_id: nextValue ?? '',
                                    uom_id: defaultModifierUomId(nextOption),
                                  })
                                }}
                                modal
                                itemToStringLabel={(id) =>
                                  productionRecipeLabelById.get(String(id)) ?? ''
                                }
                              >
                                <ComboboxInput placeholder="Recipe" className="w-full" />
                                <ComboboxContent className="z-100 pointer-events-auto">
                                  <ComboboxEmpty>No recipes.</ComboboxEmpty>
                                  <ComboboxList>
                                    {(id: string) => (
                                      <ComboboxItem key={id} value={id}>
                                        {productionRecipeLabelById.get(id) ?? id}
                                      </ComboboxItem>
                                    )}
                                  </ComboboxList>
                                </ComboboxContent>
                              </Combobox>
                            ) : (
                              <Combobox
                                items={inventoryIds}
                                value={option.inventory_item_id || null}
                                onValueChange={(nextValue) => {
                                  const nextOption = {
                                    ...option,
                                    inventory_item_id: nextValue ?? '',
                                  }
                                  updateOption(index, {
                                    inventory_item_id: nextValue ?? '',
                                    uom_id: defaultModifierUomId(nextOption),
                                  })
                                }}
                                modal
                                itemToStringLabel={(id) =>
                                  inventoryLabelById.get(String(id)) ?? ''
                                }
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
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {option.type === 'removal' ||
                        option.type === 'substitution' ? (
                          <div className="grid gap-1">
                            <Select
                              value={option.removed_component_type}
                              onValueChange={(nextType) =>
                                updateOption(index, {
                                  removed_component_type:
                                    nextType as ModifierComponentType,
                                  removed_inventory_item_id: '',
                                  removed_production_recipe_id: '',
                                })
                              }
                              disabled={pending}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inventory_item">Inventory</SelectItem>
                                <SelectItem value="production_recipe">Recipe</SelectItem>
                              </SelectContent>
                            </Select>
                            {option.removed_component_type === 'production_recipe' ? (
                              <Combobox
                                items={productionRecipeIds}
                                value={option.removed_production_recipe_id || null}
                                onValueChange={(nextValue) =>
                                  updateOption(index, {
                                    removed_production_recipe_id: nextValue ?? '',
                                  })
                                }
                                modal
                                itemToStringLabel={(id) =>
                                  productionRecipeLabelById.get(String(id)) ?? ''
                                }
                              >
                                <ComboboxInput placeholder="Removed recipe" className="w-full" />
                                <ComboboxContent className="z-100 pointer-events-auto">
                                  <ComboboxEmpty>No recipes.</ComboboxEmpty>
                                  <ComboboxList>
                                    {(id: string) => (
                                      <ComboboxItem key={id} value={id}>
                                        {productionRecipeLabelById.get(id) ?? id}
                                      </ComboboxItem>
                                    )}
                                  </ComboboxList>
                                </ComboboxContent>
                              </Combobox>
                            ) : (
                              <Combobox
                                items={inventoryIds}
                                value={option.removed_inventory_item_id || null}
                                onValueChange={(nextValue) =>
                                  updateOption(index, {
                                    removed_inventory_item_id: nextValue ?? '',
                                  })
                                }
                                modal
                                itemToStringLabel={(id) =>
                                  inventoryLabelById.get(String(id)) ?? ''
                                }
                              >
                                <ComboboxInput placeholder="Removed item" className="w-full" />
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
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={option.quantity}
                          onChange={(e) =>
                            updateOption(index, { quantity: e.target.value })
                          }
                          placeholder={
                            option.type === 'addition' ||
                            option.type === 'substitution'
                              ? 'Required'
                              : 'Optional'
                          }
                          disabled={pending}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        {option.type === 'addition' ||
                        option.type === 'substitution' ? (
                          <Select
                            value={option.uom_id || undefined}
                            onValueChange={(value) =>
                              updateOption(index, { uom_id: value })
                            }
                            disabled={
                              pending ||
                              optionUomOptions(option).length === 0
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="UOM" />
                            </SelectTrigger>
                            <SelectContent>
                              {optionUomOptions(option).map((uom) => (
                                <SelectItem key={uom.uom_id} value={uom.uom_id}>
                                  {uom.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={option.price_charge}
                          onChange={(e) =>
                            updateOption(index, { price_charge: e.target.value })
                          }
                          placeholder="0.00"
                          disabled={pending}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select
                          value={option.price_portion_behavior}
                          onValueChange={(value) =>
                            updateOption(index, {
                              price_portion_behavior:
                                value as ModifierPricePortionBehavior,
                            })
                          }
                          disabled={pending}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scale_with_portion">Scale</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex h-9 items-center justify-center">
                          <Checkbox
                            checked={option.is_default}
                            onCheckedChange={(checked) =>
                              updateOption(index, {
                                is_default: checked === true,
                              })
                            }
                            disabled={pending}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex h-9 items-center justify-center">
                          <Checkbox
                            checked={option.is_active}
                            onCheckedChange={(checked) =>
                              updateOption(index, {
                                is_active: checked === true,
                              })
                            }
                            disabled={pending}
                          />
                        </div>
                      </td>
                      <td className="py-1.5 pl-1 pr-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => removeOption(index)}
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
              Add group
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
