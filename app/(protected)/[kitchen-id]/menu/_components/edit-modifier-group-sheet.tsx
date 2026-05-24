'use client'

import { useEffect, useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  saveModifierGroupPortions,
  updateModifierGroup,
} from '../_lib/modifier-group-actions'
import { MODIFIER_GROUPS_QUERY_KEY } from '../_lib/queries'
import { mapMenuDbError } from '../_lib/db-errors'
import {
  fetchModifierGroupPortions,
  fetchModifierPortions,
} from '../_lib/client-queries'
import type { ModifierGroup } from './modifier-group-columns'
import { MenuBrandField, useMenuBrandOptions } from './menu-brand-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EditModifierGroupSheetProps {
  group: ModifierGroup
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditModifierGroupSheet({
  group,
  open,
  onOpenChange,
}: EditModifierGroupSheetProps) {
  const queryClient = useQueryClient()
  const kitchenBrands = useMenuBrandOptions()
  const activeOptionCount = group.modifier_options.filter(
    (option) => option.is_active
  ).length
  const [brandId, setBrandId] = useState(group.brand_id)
  const [name, setName] = useState(group.name)
  const [minSel, setMinSel] = useState(String(group.min_selections))
  const [maxSel, setMaxSel] = useState(
    group.max_selections == null ? '' : String(group.max_selections)
  )
  const [groupActive, setGroupActive] = useState(group.is_active)
  const [selectedPortionIds, setSelectedPortionIds] = useState<Set<string>>(
    new Set()
  )
  const [defaultPortionId, setDefaultPortionId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { data: portions = [] } = useQuery({
    queryKey: ['modifier-portions', group.kitchen_id],
    queryFn: () => fetchModifierPortions(group.kitchen_id),
    enabled: open,
  })
  const { data: groupPortions = [] } = useQuery({
    queryKey: ['modifier-group-portions', group.id, group.kitchen_id],
    queryFn: () => fetchModifierGroupPortions(group.id, group.kitchen_id),
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    const selected = new Set(groupPortions.map((portion) => portion.portion_id))
    const nextDefault =
      groupPortions.find((portion) => portion.is_default)?.portion_id ??
      groupPortions[0]?.portion_id ??
      ''
    queueMicrotask(() => {
      setSelectedPortionIds(selected)
      setDefaultPortionId(nextDefault)
    })
  }, [open, groupPortions])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setError(null)
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const min_selections = Number.parseInt(minSel, 10)
    if (Number.isNaN(min_selections) || min_selections < 0) {
      return setError('Min selections must be 0 or greater.')
    }

    let max_selections: number | null = null
    if (maxSel.trim() !== '') {
      const max = Number.parseInt(maxSel, 10)
      if (Number.isNaN(max)) return setError('Max selections must be a number or empty.')
      if (max < min_selections) {
        return setError('Max must be empty or greater than or equal to min.')
      }
      max_selections = max
    }

    startTransition(async () => {
      try {
        const gRes = await updateModifierGroup(group.id, group.kitchen_id, {
          name: name.trim(),
          ...(brandId !== group.brand_id ? { brand_id: brandId } : {}),
          min_selections,
          max_selections,
          is_active: groupActive,
        })
        if (gRes instanceof Error) return setError(mapMenuDbError(gRes))

        const portionIds = Array.from(selectedPortionIds)
        const pRes = await saveModifierGroupPortions(
          group.id,
          group.kitchen_id,
          portionIds.map((portionId, index) => ({
            portion_id: portionId,
            is_default: portionId === defaultPortionId,
            sort_order: index,
          }))
        )
        if (pRes instanceof Error) return setError(mapMenuDbError(pRes))

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
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>Edit modifier group</SheetTitle>
          <SheetDescription>
            Update group settings for {group.name}.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            <FieldGroup>
              <MenuBrandField
                id="edit-mg-brand"
                value={brandId}
                onValueChange={setBrandId}
                disabled={pending || kitchenBrands.length === 0}
              />
              <Field>
                <FieldLabel htmlFor="mg-name">Name</FieldLabel>
                <Input
                  id="mg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="mg-min">Min selections</FieldLabel>
                  <Input
                    id="mg-min"
                    type="number"
                    inputMode="numeric"
                    value={minSel}
                    onChange={(e) => setMinSel(e.target.value)}
                    min={0}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="mg-max">Max selections</FieldLabel>
                  <Input
                    id="mg-max"
                    type="number"
                    inputMode="numeric"
                    value={maxSel}
                    onChange={(e) => setMaxSel(e.target.value)}
                    placeholder="Unlimited"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Portions</FieldLabel>
                <div className="grid gap-2 rounded-md border p-3">
                  {portions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No portions are available.
                    </p>
                  ) : (
                    portions.map((portion) => {
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
                      {portions
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
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="mg-active">Active</FieldLabel>
                  {activeOptionCount === 0 && !groupActive ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Switch
                            id="mg-active"
                            checked={groupActive}
                            onCheckedChange={setGroupActive}
                            disabled
                            aria-disabled
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Add at least one active option before activating this
                        group.
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Switch
                      id="mg-active"
                      checked={groupActive}
                      onCheckedChange={setGroupActive}
                    />
                  )}
                </div>
                {activeOptionCount === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No active options yet. Use &quot;Manage Options&quot; to
                    add one or turn one on.
                  </p>
                )}
              </Field>
            </FieldGroup>
          </div>
          {error && (
            <div className="px-4">
              <FieldError>{error}</FieldError>
            </div>
          )}
          <SheetFooter>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Save Changes
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
