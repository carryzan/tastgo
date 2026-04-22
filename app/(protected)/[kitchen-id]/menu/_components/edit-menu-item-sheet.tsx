'use client'

import { useMemo, useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { updateMenuItem } from '../_lib/menu-item-actions'
import { MENU_ITEMS_QUERY_KEY } from '../_lib/queries'
import { mapMenuDbError } from '../_lib/db-errors'
import type { MenuItem } from './menu-item-columns'
import type { Menu } from '../_lib/menus'
import { MenuBrandField, useMenuBrandOptions } from './menu-brand-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface EditMenuItemSheetProps {
  item: MenuItem
  menus: Menu[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditMenuItemSheet({
  item,
  menus,
  open,
  onOpenChange,
}: EditMenuItemSheetProps) {
  const { kitchen } = useKitchen()
  const kitchenBrands = useMenuBrandOptions()
  const { upload, remove } = useKitchenUpload('menu-items')
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [brandId, setBrandId] = useState(item.brand_id)
  const [menuId, setMenuId] = useState(item.menu_id)
  const [isActive, setIsActive] = useState(item.is_active)

  const selectableMenus = useMemo(() => {
    const active = menus.filter((m) => m.brand_id === brandId && m.is_active)
    const current = menus.find((m) => m.id === menuId)
    if (current && current.brand_id === brandId && !current.is_active) {
      return [...active, current]
    }
    return active
  }, [menus, brandId, menuId])

  const menuIds = useMemo(() => selectableMenus.map((m) => m.id), [selectableMenus])
  const menuLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of selectableMenus) map.set(m.id, m.name)
    return map
  }, [selectableMenus])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setFile(null)
      setRemoveImage(false)
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

    const menuRow = menus.find((m) => m.id === menuId)
    if (!menuRow || menuRow.brand_id !== brandId) {
      return setError('Select a menu for this brand.')
    }

    const price = Number.parseFloat(priceRaw ?? '')
    if (Number.isNaN(price) || price < 0) {
      return setError('Enter a valid price (0 or greater).')
    }

    startTransition(async () => {
      try {
        let image_url: string | null | undefined = undefined
        if (file) {
          image_url = await upload(file, item.image_url)
          if (!image_url) {
            return setError(
              'Something went wrong uploading the image. Please try again.'
            )
          }
        } else if (removeImage && item.image_url) {
          await remove(item.image_url)
          image_url = null
        }

        const updates: Parameters<typeof updateMenuItem>[2] = {}
        if (name !== item.name) updates.name = name
        if (brandId !== item.brand_id) updates.brand_id = brandId
        if (menuId !== item.menu_id) updates.menu_id = menuId
        const prevPrice =
          typeof item.price === 'string' ? Number(item.price) : item.price
        if (price !== prevPrice) updates.price = price
        if (isActive !== item.is_active) updates.is_active = isActive
        if (image_url !== undefined) updates.image_url = image_url

        if (Object.keys(updates).length > 0) {
          const u = await updateMenuItem(item.id, kitchen.id, updates)
          if (u instanceof Error) return setError(mapMenuDbError(u))
        }

        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: MENU_ITEMS_QUERY_KEY })
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
          <SheetTitle>Edit menu item</SheetTitle>
          <SheetDescription>
            Update details for this menu item.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            <FieldGroup>
              <MenuBrandField
                id="edit-mi-brand"
                value={brandId}
                onValueChange={(id) => {
                  setBrandId(id)
                  setMenuId('')
                }}
                disabled={pending || kitchenBrands.length === 0}
              />
              <Field>
                <FieldLabel htmlFor="edit-mi-name">Name</FieldLabel>
                <Input
                  id="edit-mi-name"
                  name="name"
                  defaultValue={item.name}
                  required
                />
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
                    <ComboboxEmpty>No menus available.</ComboboxEmpty>
                    <ComboboxList>
                      {(id: string) => (
                        <ComboboxItem key={id} value={id}>
                          {menuLabelById.get(id) ?? id}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-mi-price">Price</FieldLabel>
                <Input
                  id="edit-mi-price"
                  name="price"
                  type="text"
                  inputMode="decimal"
                  required
                  defaultValue={
                    typeof item.price === 'string'
                      ? item.price
                      : String(item.price)
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-mi-image">Replace image</FieldLabel>
                <Input
                  id="edit-mi-image"
                  type="file"
                  accept="image/*"
                  onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
                />
                {item.image_url && (
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox
                      id="edit-mi-rmimg"
                      checked={removeImage}
                      onCheckedChange={(c) => setRemoveImage(c === true)}
                    />
                    <Label htmlFor="edit-mi-rmimg" className="text-sm font-normal">
                      Remove current image
                    </Label>
                  </div>
                )}
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="edit-mi-active">Active</FieldLabel>
                  {!item.current_recipe_version_id && !isActive ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Switch
                            id="edit-mi-active"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                            disabled
                            aria-disabled
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Create a recipe version first to activate this item.
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Switch
                      id="edit-mi-active"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                  )}
                </div>
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
              <Button variant="outline" type="button" disabled={pending}>
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
