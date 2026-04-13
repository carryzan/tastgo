'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createModifierGroup } from '../_lib/modifier-group-actions'
import { MODIFIER_GROUPS_QUERY_KEY } from '../_lib/queries'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MenuBrandField, useMenuBrandOptions } from './menu-brand-field'

interface AddModifierGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
}

export function AddModifierGroupDialog({
  open,
  onOpenChange,
  kitchenId,
}: AddModifierGroupDialogProps) {
  const queryClient = useQueryClient()
  const brands = useMenuBrandOptions()
  const [brandOverride, setBrandOverride] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const brandId =
    brandOverride != null && brands.some((b) => b.id === brandOverride)
      ? brandOverride
      : brands[0]?.id ?? ''

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setBrandOverride(null)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const name = (fd.get('name') as string)?.trim()
    const minRaw = (fd.get('min_selections') as string)?.trim()
    const maxRaw = (fd.get('max_selections') as string)?.trim()

    if (!name) return

    const min_selections =
      minRaw === '' ? 0 : Number.parseInt(minRaw, 10)
    if (Number.isNaN(min_selections) || min_selections < 0) {
      return setError('Min selections must be 0 or greater.')
    }

    let max_selections: number | null = null
    if (maxRaw !== '') {
      const max = Number.parseInt(maxRaw, 10)
      if (Number.isNaN(max)) {
        return setError('Max selections must be a whole number or empty.')
      }
      if (max < min_selections) {
        return setError('Max selections must be empty or greater than or equal to min.')
      }
      max_selections = max
    }

    if (!brandId) return setError('Select a brand.')

    startTransition(async () => {
      try {
        const result = await createModifierGroup({
          kitchen_id: kitchenId,
          brand_id: brandId,
          name,
          min_selections,
          max_selections,
        })
        if (result instanceof Error) return setError(result.message)
        form.reset()
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: MODIFIER_GROUPS_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Add modifier group</DialogTitle>
          <DialogDescription>
            Reusable option groups (for example size or add-ons).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <MenuBrandField
              id="add-mg-brand"
              value={brandId}
              onValueChange={setBrandOverride}
              disabled={pending || brands.length === 0}
            />
            <Field>
              <FieldLabel htmlFor="add-mg-name">Name</FieldLabel>
              <Input id="add-mg-name" name="name" required placeholder="e.g. Size" />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-mg-min">Min selections</FieldLabel>
              <Input
                id="add-mg-min"
                name="min_selections"
                type="number"
                inputMode="numeric"
                defaultValue={0}
                min={0}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-mg-max">Max selections</FieldLabel>
              <Input
                id="add-mg-max"
                name="max_selections"
                type="number"
                inputMode="numeric"
                placeholder="Unlimited"
              />
              <FieldDescription>Leave empty for no maximum.</FieldDescription>
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || brands.length === 0 || !brandId}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Add group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
