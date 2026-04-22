'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createMenu } from '../_lib/menu-actions'
import { mapMenuDbError } from '../_lib/db-errors'
import type { Menu } from '../_lib/menus'
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

interface AddMenuProps {
  kitchenId: string
  menus: Menu[]
}

export function AddMenu({ kitchenId, menus }: AddMenuProps) {
  const router = useRouter()
  const brands = useMenuBrandOptions()
  const [brandOverride, setBrandOverride] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const brandId =
    brandOverride != null && brands.some((b) => b.id === brandOverride)
      ? brandOverride
      : brands[0]?.id ?? ''

  const menusForBrand = useMemo(
    () => menus.filter((m) => m.brand_id === brandId),
    [menus, brandId]
  )

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const name = (fd.get('name') as string)?.trim()
    const sortRaw = (fd.get('sort_order') as string)?.trim()
    if (!name) return
    if (!brandId) return setError('Select a brand.')

    const sort_order = sortRaw === '' ? 0 : Number.parseInt(sortRaw, 10)
    if (Number.isNaN(sort_order)) {
      return setError('Sort order must be a whole number.')
    }

    const exists = menusForBrand.some(
      (m) => m.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) {
      return setError('A menu with this name already exists for this brand.')
    }

    startTransition(async () => {
      try {
        const result = await createMenu({
          kitchen_id: kitchenId,
          brand_id: brandId,
          name,
          sort_order,
        })
        if (result instanceof Error) return setError(mapMenuDbError(result))
        form.reset()
        setBrandOverride(null)
        setOpen(false)
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const blockClose = (e: { preventDefault(): void }) => {
    if (pending) e.preventDefault()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!pending) {
          setOpen(v)
          if (!v) {
            setError(null)
            setBrandOverride(null)
          }
        }
      }}
    >
      <Button onClick={() => setOpen(true)} disabled={brands.length === 0}>
        Add Menu
      </Button>
      <DialogContent
        className="sm:max-w-sm"
        onInteractOutside={blockClose}
        onEscapeKeyDown={blockClose}
      >
        <DialogHeader>
          <DialogTitle>Add Menu</DialogTitle>
          <DialogDescription>
            Create a menu category for a brand (for example Breakfast or Lunch).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <MenuBrandField
              id="add-menu-brand"
              value={brandId}
              onValueChange={setBrandOverride}
              disabled={pending || brands.length === 0}
            />
            <Field>
              <FieldLabel htmlFor="add-menu-name">Name</FieldLabel>
              <Input
                id="add-menu-name"
                name="name"
                placeholder="e.g. Lunch"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-menu-sort">Sort order</FieldLabel>
              <Input
                id="add-menu-sort"
                name="sort_order"
                type="number"
                inputMode="numeric"
                placeholder="0"
                defaultValue={0}
              />
              <FieldDescription>Lower numbers appear first.</FieldDescription>
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || brands.length === 0 || !brandId}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
