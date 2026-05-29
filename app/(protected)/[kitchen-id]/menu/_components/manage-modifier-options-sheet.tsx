'use client'

import { useMemo, useState, useTransition } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import {
  fetchInventoryUomConversions,
  fetchProductionRecipeUomConversions,
  type InventoryUomConversion,
  type KitchenUom,
  type ProductionRecipeUomConversion,
} from '@/lib/uom-conversions'
import {
  saveModifierGroupOptions,
  type ModifierOptionInput,
  type ModifierOptionType,
  type ModifierPricePortionBehavior,
} from '../_lib/modifier-option-actions'
import { MODIFIER_GROUPS_QUERY_KEY } from '../_lib/queries'
import { mapMenuDbError } from '../_lib/db-errors'
import {
  fetchActiveInventoryItemPicks,
  fetchActiveProductionRecipes,
  fetchModifierOptions,
  type InventoryItemBasicPick,
  type ProductionRecipePick,
} from '../_lib/client-queries'
import {
  createLocalModifierComponent,
  ModifierComponentsEditor,
  type LocalModifierComponent,
} from './modifier-components-editor'
import type { ModifierGroup } from './modifier-group-columns'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldError } from '@/components/ui/field'

interface LocalOption {
  key: string
  id?: string
  name: string
  type: ModifierOptionType
  price_charge: string
  is_active: boolean
  is_default: boolean
  price_portion_behavior: ModifierPricePortionBehavior
  components: LocalModifierComponent[]
}

interface FetchedModifierOptionComponent {
  id: string
  direction: string
  component_type: string
  inventory_item_id: string | null
  production_recipe_id: string | null
  quantity: string | number | null
  uom_id: string | null
  sort_order: number | null
}

interface FetchedModifierOption {
  id: string
  name: string | null
  type: string | null
  price_charge: string | number | null
  is_active: boolean | null
  is_default: boolean | null
  price_portion_behavior: string | null
  modifier_option_components?: FetchedModifierOptionComponent[] | null
}

const OPTION_TYPES: ModifierOptionType[] = [
  'addition',
  'removal',
  'substitution',
  'neutral',
]

function newLocalOption(): LocalOption {
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

interface ManageModifierOptionsSheetProps {
  group: ModifierGroup
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageModifierOptionsSheet({
  group,
  open,
  onOpenChange,
}: ManageModifierOptionsSheetProps) {
  const { unitsOfMeasure } = useKitchen()
  const uoms = unitsOfMeasure as KitchenUom[]
  const queryClient = useQueryClient()
  const [draftOptions, setDraftOptions] = useState<LocalOption[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { data: inventoryItems = [], isError: inventoryItemsLoadError } = useQuery<
    InventoryItemBasicPick[]
  >({
    queryKey: ['modifier-option-inventory-picks', group.kitchen_id],
    queryFn: () => fetchActiveInventoryItemPicks(group.kitchen_id),
    enabled: open,
  })
  const { data: productionRecipes = [] } = useQuery<ProductionRecipePick[]>({
    queryKey: ['modifier-option-production-recipe-picks', group.kitchen_id],
    queryFn: () => fetchActiveProductionRecipes(group.kitchen_id),
    enabled: open,
  })
  const { data: fetchedOptions = [], isError: optionsLoadError } = useQuery({
    queryKey: ['modifier-options', group.id, group.kitchen_id],
    queryFn: () => fetchModifierOptions(group.id, group.kitchen_id),
    enabled: open,
  })
  const { data: uomConversions = [] } = useQuery<InventoryUomConversion[]>({
    queryKey: ['inventory-uom-conversions', group.kitchen_id],
    queryFn: () => fetchInventoryUomConversions(group.kitchen_id),
    enabled: open,
  })
  const { data: productionUomConversions = [] } = useQuery<
    ProductionRecipeUomConversion[]
  >({
    queryKey: ['production-recipe-uom-conversions', group.kitchen_id],
    queryFn: () => fetchProductionRecipeUomConversions(group.kitchen_id),
    enabled: open,
  })

  const fetchedOptionRows = useMemo<LocalOption[]>(
    () =>
      (fetchedOptions as FetchedModifierOption[]).map((option) => {
        const id = String(option.id)
        return {
          key: id,
          id,
          name: String(option.name ?? ''),
          type: (option.type as ModifierOptionType) ?? 'neutral',
          price_charge: String(option.price_charge ?? '0'),
          is_active: Boolean(option.is_active),
          is_default: Boolean(option.is_default),
          price_portion_behavior:
            (option.price_portion_behavior as ModifierPricePortionBehavior | null) ??
            'scale_with_portion',
          components: (option.modifier_option_components ?? [])
            .map((component, componentIndex): LocalModifierComponent => {
              const direction =
                component.direction === 'remove' ? 'remove' : 'add'
              const componentType =
                component.component_type === 'production_recipe'
                  ? 'production_recipe'
                  : 'inventory_item'

              return {
                key: String(component.id ?? `${id}-${componentIndex}`),
                direction,
                component_type: componentType,
                inventory_item_id: String(component.inventory_item_id ?? ''),
                production_recipe_id: String(component.production_recipe_id ?? ''),
                quantity: component.quantity == null ? '' : String(component.quantity),
                uom_id: String(component.uom_id ?? ''),
                sort_order: Number(component.sort_order ?? componentIndex),
              }
            })
            .sort((a, b) => a.sort_order - b.sort_order),
        }
      }),
    [fetchedOptions]
  )
  const options = draftOptions ?? fetchedOptionRows
  const displayedError =
    error ||
    (inventoryItemsLoadError || optionsLoadError
      ? 'Failed to load options.'
      : null)

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setDraftOptions(null)
      setError(null)
    }
  }

  function updateOption(idx: number, patch: Partial<LocalOption>) {
    setDraftOptions((current) => {
      const base = current ?? fetchedOptionRows
      return base.map((option, index) =>
        index === idx ? { ...option, ...patch } : option
      )
    })
  }

  function componentsForOptionType(option: LocalOption, type: ModifierOptionType) {
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

  function validateOptions(): string | null {
    for (const o of options) {
      if (!o.name.trim()) return 'Each option needs a name.'
      const pc = Number.parseFloat(o.price_charge)
      if (Number.isNaN(pc) || pc < 0) return 'Option prices must be 0 or greater.'

      if (o.type === 'addition' || o.type === 'substitution') {
        if (!o.components.some((component) => component.direction === 'add')) {
          return `Option "${o.name}": add at least one stock component.`
        }
      }
      if (o.type === 'removal' || o.type === 'substitution') {
        if (!o.components.some((component) => component.direction === 'remove')) {
          return `Option "${o.name}": add at least one removed stock component.`
        }
      }
      if (o.type === 'neutral' && o.components.length > 0) {
        return `Option "${o.name}": neutral options cannot have stock components.`
      }
      for (const component of o.components) {
        if (component.component_type === 'inventory_item' && !component.inventory_item_id) {
          return `Option "${o.name}": select an inventory item for every component.`
        }
        if (component.component_type === 'production_recipe' && !component.production_recipe_id) {
          return `Option "${o.name}": select a production recipe for every component.`
        }
        if (component.direction === 'add') {
          const quantity = Number.parseFloat(component.quantity)
          if (component.quantity.trim() === '' || Number.isNaN(quantity) || quantity <= 0) {
            return `Option "${o.name}": added components require a quantity greater than zero.`
          }
          if (!component.uom_id) {
            return `Option "${o.name}": select a UOM for every added component.`
          }
        }
      }
    }

    // Prevent deactivating the last active option when the group itself is active.
    // The DB will enforce this too (guard_modifier_group_last_option), but we
    // block it client-side for a better UX.
    if (group.is_active) {
      const activeCount = options.filter((o) => o.is_active).length
      if (activeCount === 0) {
        return 'Cannot deactivate all options — the group is active. Deactivate the group first or keep at least one option active.'
      }
    }

    return null
  }

  function handleSubmit() {
    setError(null)

    const optErr = validateOptions()
    if (optErr) return setError(optErr)

    startTransition(async () => {
      try {
        const payload: ModifierOptionInput[] = options.map((o) => ({
          id: o.id,
          name: o.name.trim(),
          type: o.type,
          price_charge: Number.parseFloat(o.price_charge),
          is_active: o.is_active,
          is_default: o.is_default,
          price_portion_behavior: o.price_portion_behavior,
          components: o.components.map((component, componentIndex) => ({
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
        }))

        const oRes = await saveModifierGroupOptions(
          group.id,
          group.kitchen_id,
          payload
        )
        if (oRes instanceof Error) return setError(mapMenuDbError(oRes))

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
        className="sm:max-w-3xl"
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>Options — {group.name}</SheetTitle>
          <SheetDescription>
            Manage the modifier options in this group.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-medium">Options</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDraftOptions((current) => [
                  ...(current ?? fetchedOptionRows),
                  newLocalOption(),
                ])
              }
              disabled={pending}
            >
              <PlusIcon />
              Add option
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="grid gap-3">
              {options.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No options yet. Add one to get started.
                </div>
              ) : (
                options.map((o, idx) => (
                  <div key={o.key} className="grid gap-4 rounded-md border p-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(12rem,1fr)_9rem_7rem_8rem_5rem_4rem_2rem]">
                      <Input
                        value={o.name}
                        onChange={(e) => updateOption(idx, { name: e.target.value })}
                        placeholder="Option name"
                        disabled={pending}
                      />
                      <Select
                        value={o.type}
                        onValueChange={(value) => {
                          const nextType = value as ModifierOptionType
                          updateOption(idx, {
                            type: nextType,
                            components: componentsForOptionType(o, nextType),
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
                        inputMode="decimal"
                        value={o.price_charge}
                        onChange={(e) => updateOption(idx, { price_charge: e.target.value })}
                        placeholder="Price"
                        disabled={pending}
                      />
                      <Select
                        value={o.price_portion_behavior}
                        onValueChange={(value) =>
                          updateOption(idx, {
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
                          checked={o.is_default}
                          onCheckedChange={(checked) =>
                            updateOption(idx, { is_default: checked === true })
                          }
                          disabled={pending}
                        />
                        Default
                      </label>
                      <label className="flex h-9 items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={o.is_active}
                          onCheckedChange={(checked) =>
                            updateOption(idx, { is_active: checked === true })
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
                        onClick={() =>
                          setDraftOptions((current) =>
                            (current ?? fetchedOptionRows).filter(
                              (_, index) => index !== idx
                            )
                          )
                        }
                        disabled={pending}
                        aria-label="Remove option"
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                    <ModifierComponentsEditor
                      components={o.components}
                      onChange={(components) => updateOption(idx, { components })}
                      inventoryItems={inventoryItems}
                      productionRecipes={productionRecipes}
                      inventoryUomConversions={uomConversions}
                      productionUomConversions={productionUomConversions}
                      uoms={uoms}
                      disabled={pending || o.type === 'neutral'}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="border-t" />

        {displayedError && (
          <div className="px-4 pt-3">
            <FieldError>{displayedError}</FieldError>
          </div>
        )}

        <SheetFooter>
          <Button onClick={handleSubmit} disabled={pending} className="min-w-28">
            {pending && <Spinner data-icon="inline-start" />}
            Save
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
