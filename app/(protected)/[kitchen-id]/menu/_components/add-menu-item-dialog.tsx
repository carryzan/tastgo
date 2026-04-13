'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { createMenuItem } from '../_lib/menu-item-actions'
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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { MENU_ITEMS_QUERY_KEY } from '../_lib/queries'
import type { Menu } from '../_lib/menus'
import { MenuBrandField, useMenuBrandOptions } from './menu-brand-field'

interface AddMenuItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  menus: Menu[]
}

export function AddMenuItemDialog({
  open,
  onOpenChange,
  menus,
}: AddMenuItemDialogProps) {
  const { kitchen } = useKitchen()
  const brands = useMenuBrandOptions()
  const { upload } = useKitchenUpload('menu-items')
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [brandOverride, setBrandOverride] = useState<string | null>(null)
  const [menuId, setMenuId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const brandId =
    brandOverride != null && brands.some((b) => b.id === brandOverride)
      ? brandOverride
      : brands[0]?.id ?? ''

  useEffect(() => {
    if (!open) return
    setMenuId('')
  }, [open, brandId])

  const activeMenus = useMemo(
    () => menus.filter((m) => m.brand_id === brandId && m.is_active),
    [menus, brandId]
  )

  const menuIds = useMemo(() => activeMenus.map((m) => m.id), [activeMenus])

  const menuLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of activeMenus) map.set(m.id, m.name)
    return map
  }, [activeMenus])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setFile(null)
      setMenuId('')
      setBrandOverride(null)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const name = (fd.get('name') as string)?.trim()
    const priceRaw = (fd.get('price') as string)?.trim()

    if (!name) return
    if (!menuId) return setError('Select a menu.')

    const menuRow = activeMenus.find((m) => m.id === menuId)
    if (!menuRow || menuRow.brand_id !== brandId) {
      return setError('Select a menu.')
    }

    const price = Number.parseFloat(priceRaw ?? '')
    if (Number.isNaN(price) || price < 0) {
      return setError('Enter a valid price (0 or greater).')
    }

    startTransition(async () => {
      try {
        let image_url: string | null = null
        if (file) {
          image_url = await upload(file)
          if (!image_url) {
            return setError(
              'Something went wrong uploading the image. Please try again.'
            )
          }
        }

        const result = await createMenuItem({
          kitchen_id: kitchen.id,
          brand_id: menuRow.brand_id,
          menu_id: menuId,
          name,
          price,
          image_url,
        })

        if (result instanceof Error) return setError(result.message)

        form.reset()
        setFile(null)
        setMenuId('')
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: MENU_ITEMS_QUERY_KEY })
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
          <DialogTitle>Add menu item</DialogTitle>
          <DialogDescription>
            Create an item on a menu under a brand.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <MenuBrandField
              id="add-mi-brand"
              value={brandId}
              onValueChange={setBrandOverride}
              disabled={pending || brands.length === 0}
            />
            <Field>
              <FieldLabel htmlFor="add-mi-name">Name</FieldLabel>
              <Input id="add-mi-name" name="name" required placeholder="Item name" />
            </Field>
            <Field>
              <FieldLabel>Menu</FieldLabel>
              <Combobox
                items={menuIds}
                value={menuId}
                onValueChange={(v) => setMenuId(v ?? '')}
                modal
                itemToStringLabel={(id) =>
                  menuLabelById.get(String(id)) ?? ''
                }
              >
                <ComboboxInput placeholder="Select menu" className="w-full" />
                <ComboboxContent className="z-100">
                  <ComboboxEmpty>No active menus.</ComboboxEmpty>
                  <ComboboxList>
                    {(item: string) => (
                      <ComboboxItem key={item} value={item}>
                        {menuLabelById.get(item) ?? item}
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
                name="price"
                type="text"
                inputMode="decimal"
                required
                placeholder="0.00"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-mi-image">Image</FieldLabel>
              <Input
                id="add-mi-image"
                type="file"
                accept="image/*"
                onChange={(ev) => {
                  const f = ev.target.files?.[0]
                  setFile(f ?? null)
                }}
              />
              <FieldDescription>Shown in the menu list.</FieldDescription>
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={
                pending ||
                brands.length === 0 ||
                !brandId ||
                !menuId ||
                activeMenus.length === 0
              }
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Add item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
