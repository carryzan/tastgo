'use client'

import { useEffect, useState, useTransition } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import {
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
  ModifierOptionType,
  ModifierPricePortionBehavior,
} from '../_lib/modifier-option-actions'
import {
  createLocalModifierComponent,
  ModifierComponentsEditor,
  type LocalModifierComponent,
} from './modifier-components-editor'
import { MenuBrandField, useMenuBrandOptions } from './menu-brand-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  price_charge: string
  is_active: boolean
  is_default: boolean
  price_portion_behavior: ModifierPricePortionBehavior
  components: LocalModifierComponent[]
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
    price_charge: '0',
    is_active: true,
    is_default: false,
    price_portion_behavior: 'scale_with_portion',
    components: [],
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

  function componentsForOptionType(
    option: LocalOption,
    type: ModifierOptionType
  ) {
    if (type === 'neutral') return []

    let next = option.components.filter((component) => {
      if (type === 'addition') return component.direction === 'add'
      if (type === 'removal') return component.direction === 'remove'
      return true
    })

    if ((type === 'addition' || type === 'substitution') && !next.some((c) => c.direction === 'add')) {
      next = [...next, createLocalModifierComponent('add')]
    }
    if ((type === 'removal' || type === 'substitution') && !next.some((c) => c.direction === 'remove')) {
      next = [...next, createLocalModifierComponent('remove')]
    }

    return next.map((component, index) => ({ ...component, sort_order: index }))
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
        if (!option.components.some((component) => component.direction === 'add')) {
          return `Option "${option.name || 'Untitled'}": add at least one stock component.`
        }
      }

      if (option.type === 'removal' || option.type === 'substitution') {
        if (!option.components.some((component) => component.direction === 'remove')) {
          return `Option "${option.name || 'Untitled'}": add at least one removed stock component.`
        }
      }

      if (option.type === 'neutral' && option.components.length > 0) {
        return `Option "${option.name || 'Untitled'}": neutral options cannot have stock components.`
      }

      for (const component of option.components) {
        if (component.component_type === 'inventory_item' && !component.inventory_item_id) {
          return `Option "${option.name || 'Untitled'}": select an inventory item for every component.`
        }
        if (
          component.component_type === 'production_recipe' &&
          !component.production_recipe_id
        ) {
          return `Option "${option.name || 'Untitled'}": select a production recipe for every component.`
        }
        if (component.direction === 'add') {
          const quantity = Number.parseFloat(component.quantity)
          if (component.quantity.trim() === '' || Number.isNaN(quantity) || quantity <= 0) {
            return `Option "${option.name || 'Untitled'}": added components require a quantity greater than zero.`
          }
          if (!component.uom_id) {
            return `Option "${option.name || 'Untitled'}": select a UOM for every added component.`
          }
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
            price_charge: Number.parseFloat(option.price_charge),
            is_active: option.is_active,
            is_default: option.is_default,
            price_portion_behavior: option.price_portion_behavior,
            components: option.components.map((component, componentIndex) => ({
              direction: component.direction,
              component_type: component.component_type,
              inventory_item_id:
                component.component_type === 'inventory_item'
                  ? component.inventory_item_id || null
                  : null,
              production_recipe_id:
                component.component_type === 'production_recipe'
                  ? component.production_recipe_id || null
                  : null,
              quantity:
                component.direction === 'add'
                  ? Number.parseFloat(component.quantity)
                  : null,
              uom_id: component.direction === 'add' ? component.uom_id || null : null,
              sort_order: component.sort_order ?? componentIndex,
            })),
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

          <div className="grid gap-3">
            {options.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No options yet. Add at least one active option before saving.
              </div>
            ) : (
              options.map((option, index) => (
                <div key={option.key} className="grid gap-4 rounded-md border p-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_9rem_7rem_8rem_5rem_4rem_2rem]">
                    <Input
                      value={option.name}
                      onChange={(e) => updateOption(index, { name: e.target.value })}
                      placeholder="Option name"
                      disabled={pending}
                    />
                    <Select
                      value={option.type}
                      onValueChange={(nextValue) => {
                        const nextType = nextValue as ModifierOptionType
                        updateOption(index, {
                          type: nextType,
                          components: componentsForOptionType(option, nextType),
                        })
                      }}
                      disabled={pending}
                    >
                      <SelectTrigger>
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
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={option.price_charge}
                      onChange={(e) => updateOption(index, { price_charge: e.target.value })}
                      placeholder="Price"
                      disabled={pending}
                    />
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scale_with_portion">Scale</SelectItem>
                        <SelectItem value="fixed">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="flex h-9 items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={option.is_default}
                        onCheckedChange={(checked) =>
                          updateOption(index, { is_default: checked === true })
                        }
                        disabled={pending}
                      />
                      Default
                    </label>
                    <label className="flex h-9 items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={option.is_active}
                        onCheckedChange={(checked) =>
                          updateOption(index, { is_active: checked === true })
                        }
                        disabled={pending}
                      />
                      On
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeOption(index)}
                      disabled={pending}
                      aria-label="Remove option"
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                  <ModifierComponentsEditor
                    components={option.components}
                    onChange={(components) => updateOption(index, { components })}
                    inventoryItems={inventoryItems}
                    productionRecipes={productionRecipes}
                    inventoryUomConversions={uomConversions}
                    productionUomConversions={productionUomConversions}
                    uoms={uoms}
                    disabled={pending || option.type === 'neutral'}
                  />
                </div>
              ))
            )}
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
