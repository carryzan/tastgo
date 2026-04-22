'use client'

import { useMemo, useState, useTransition } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  saveModifierGroupOptions,
  type ModifierOptionType,
} from '../_lib/modifier-option-actions'
import { MODIFIER_GROUPS_QUERY_KEY } from '../_lib/queries'
import { mapMenuDbError } from '../_lib/db-errors'
import {
  fetchActiveInventoryItemPicks,
  fetchModifierOptions,
  type InventoryItemBasicPick,
} from '../_lib/client-queries'
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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { FieldError } from '@/components/ui/field'

interface LocalOption {
  key: string
  id?: string
  name: string
  type: ModifierOptionType
  inventory_item_id: string
  removed_inventory_item_id: string
  quantity: string
  price_charge: string
  is_active: boolean
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
    inventory_item_id: '',
    removed_inventory_item_id: '',
    quantity: '',
    price_charge: '0',
    is_active: true,
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
  const { data: fetchedOptions = [], isError: optionsLoadError } = useQuery({
    queryKey: ['modifier-options', group.id, group.kitchen_id],
    queryFn: () => fetchModifierOptions(group.id, group.kitchen_id),
    enabled: open,
  })

  const invIds = useMemo(() => inventoryItems.map((i) => i.id), [inventoryItems])
  const invLabelById = useMemo(() => {
    const m = new Map<string, string>()
    for (const i of inventoryItems) m.set(i.id, i.name)
    return m
  }, [inventoryItems])

  const fetchedOptionRows = useMemo(
    () =>
      fetchedOptions.map((option) => {
        const id = String(option.id)
        return {
          key: id,
          id,
          name: String(option.name ?? ''),
          type: (option.type as ModifierOptionType) ?? 'neutral',
          inventory_item_id: String(option.inventory_item_id ?? ''),
          removed_inventory_item_id: String(
            option.removed_inventory_item_id ?? ''
          ),
          quantity: option.quantity == null ? '' : String(option.quantity),
          price_charge: String(option.price_charge ?? '0'),
          is_active: Boolean(option.is_active),
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

  function validateOptions(): string | null {
    for (const o of options) {
      if (!o.name.trim()) return 'Each option needs a name.'
      const pc = Number.parseFloat(o.price_charge)
      if (Number.isNaN(pc) || pc < 0) return 'Option prices must be 0 or greater.'

      if (o.type === 'addition' || o.type === 'substitution') {
        const q = Number.parseFloat(o.quantity)
        if (o.quantity.trim() === '' || Number.isNaN(q) || q <= 0) {
          return `Option "${o.name}": quantity is required for ${o.type} type.`
        }
        if (!o.inventory_item_id) {
          return `Option "${o.name}": select an inventory item for ${o.type} type.`
        }
      }
      if (o.type === 'removal' || o.type === 'substitution') {
        if (!o.removed_inventory_item_id) {
          return `Option "${o.name}": select the item being removed for ${o.type} type.`
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
        const payload = options.map((o) => ({
          id: o.id,
          name: o.name.trim(),
          type: o.type,
          inventory_item_id: o.inventory_item_id || null,
          removed_inventory_item_id: o.removed_inventory_item_id || null,
          quantity:
            o.type === 'removal' && o.quantity.trim() === ''
              ? null
              : o.quantity.trim() === ''
                ? null
                : Number.parseFloat(o.quantity),
          price_charge: Number.parseFloat(o.price_charge),
          is_active: o.is_active,
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
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full min-w-[700px] table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-28" />
                <col />
                <col />
                <col className="w-16" />
                <col className="w-20" />
                <col className="w-14" />
                <col className="w-12" />
              </colgroup>
              <thead className="sticky top-0 bg-popover">
                <tr className="border-y">
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
                    Price
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
                      colSpan={8}
                      className="py-8 pl-4 text-center text-sm text-muted-foreground"
                    >
                      No options yet. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  options.map((o, idx) => (
                    <tr key={o.key} className="border-b">
                      <td className="py-1.5 pl-4 pr-2">
                        <Input
                          value={o.name}
                          onChange={(e) =>
                            updateOption(idx, { name: e.target.value })
                          }
                          placeholder="Name"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select
                          value={o.type}
                          onValueChange={(v) =>
                            updateOption(idx, { type: v as ModifierOptionType })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPTION_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-2 py-1.5">
                        {o.type === 'addition' || o.type === 'substitution' ? (
                          <Combobox
                            items={invIds}
                            value={o.inventory_item_id || null}
                            onValueChange={(next) =>
                              updateOption(idx, {
                                inventory_item_id: next ?? '',
                              })
                            }
                            modal
                            itemToStringLabel={(id) =>
                              invLabelById.get(String(id)) ?? ''
                            }
                          >
                            <ComboboxInput
                              placeholder="Item"
                              className="w-full"
                            />
                            <ComboboxContent className="z-100 pointer-events-auto">
                              <ComboboxEmpty>No items.</ComboboxEmpty>
                              <ComboboxList>
                                {(id: string) => (
                                  <ComboboxItem key={id} value={id}>
                                    {invLabelById.get(id) ?? id}
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {o.type === 'removal' || o.type === 'substitution' ? (
                          <Combobox
                            items={invIds}
                            value={o.removed_inventory_item_id || null}
                            onValueChange={(next) =>
                              updateOption(idx, {
                                removed_inventory_item_id: next ?? '',
                              })
                            }
                            modal
                            itemToStringLabel={(id) =>
                              invLabelById.get(String(id)) ?? ''
                            }
                          >
                            <ComboboxInput
                              placeholder="Removed"
                              className="w-full"
                            />
                            <ComboboxContent className="z-100 pointer-events-auto">
                              <ComboboxEmpty>No items.</ComboboxEmpty>
                              <ComboboxList>
                                {(id: string) => (
                                  <ComboboxItem key={id} value={id}>
                                    {invLabelById.get(id) ?? id}
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {o.type === 'addition' || o.type === 'substitution' ? (
                          <Input
                            inputMode="decimal"
                            value={o.quantity}
                            onChange={(e) =>
                              updateOption(idx, { quantity: e.target.value })
                            }
                            placeholder="0"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          inputMode="decimal"
                          value={o.price_charge}
                          onChange={(e) =>
                            updateOption(idx, { price_charge: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Checkbox
                          checked={o.is_active}
                          onCheckedChange={(c) =>
                            updateOption(idx, { is_active: c === true })
                          }
                        />
                      </td>
                      <td className="py-1.5 pl-1 pr-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            setDraftOptions((current) =>
                              (current ?? fetchedOptionRows).filter(
                                (_, index) => index !== idx
                              )
                            )
                          }
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
