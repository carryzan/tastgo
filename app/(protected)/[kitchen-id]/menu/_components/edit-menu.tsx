'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateMenu } from '../_lib/menu-actions'
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { MenuBrandField, useMenuBrandOptions } from './menu-brand-field'

interface EditMenuProps {
  kitchenId: string
  menus: Menu[]
  menu: Menu
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditMenu({
  kitchenId,
  menus,
  menu,
  open,
  onOpenChange,
}: EditMenuProps) {
  const router = useRouter()
  const kitchenBrands = useMenuBrandOptions()
  const [brandId, setBrandId] = useState(menu.brand_id)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [isActive, setIsActive] = useState(menu.is_active)

  useEffect(() => {
    if (open) {
      setBrandId(menu.brand_id)
      setIsActive(menu.is_active)
    }
  }, [open, menu.id, menu.brand_id, menu.is_active])

  const menusForDuplicateCheck = useMemo(
    () => menus.filter((m) => m.brand_id === brandId),
    [menus, brandId]
  )

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const name = (fd.get('name') as string)?.trim()
    const sortRaw = (fd.get('sort_order') as string)?.trim()
    if (!name) return

    const sort_order = sortRaw === '' ? menu.sort_order : Number.parseInt(sortRaw, 10)
    if (Number.isNaN(sort_order)) {
      return setError('Sort order must be a whole number.')
    }

    const exists = menusForDuplicateCheck.some(
      (m) =>
        m.id !== menu.id &&
        m.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) {
      return setError('Another menu already uses this name for this brand.')
    }

    startTransition(async () => {
      try {
        const updates: Parameters<typeof updateMenu>[2] = {
          name,
          sort_order,
          is_active: isActive,
        }
        if (brandId !== menu.brand_id) updates.brand_id = brandId

        const result = await updateMenu(menu.id, kitchenId, updates)
        if (result instanceof Error) return setError(result.message)
        onOpenChange(false)
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit Menu</DialogTitle>
          <DialogDescription>Update brand, name, order, and visibility.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <MenuBrandField
              id="edit-menu-brand"
              value={brandId}
              onValueChange={setBrandId}
              disabled={pending || kitchenBrands.length === 0}
            />
            <Field>
              <FieldLabel htmlFor="edit-menu-name">Name</FieldLabel>
              <Input
                id="edit-menu-name"
                name="name"
                defaultValue={menu.name}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-menu-sort">Sort order</FieldLabel>
              <Input
                id="edit-menu-sort"
                name="sort_order"
                type="number"
                inputMode="numeric"
                defaultValue={menu.sort_order}
              />
            </Field>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-menu-active">Active</Label>
                <p className="text-muted-foreground text-xs">
                  Inactive menus stay hidden from new items.
                </p>
              </div>
              <Switch
                id="edit-menu-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
