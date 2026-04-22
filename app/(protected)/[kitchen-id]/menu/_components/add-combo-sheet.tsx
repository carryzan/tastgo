'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { createCombo } from '../_lib/combo-actions'
import { COMBOS_QUERY_KEY } from '../_lib/queries'
import { mapMenuDbError } from '../_lib/db-errors'
import {
  fetchMenuItemPicksForBrand,
  type MenuItemPick,
} from '../_lib/client-queries'
import { MenuBrandField, useMenuBrandOptions } from './menu-brand-field'
import { Button } from '@/components/ui/button'
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
  FieldDescription,
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

interface ComboLine {
  key: string
  menu_item_id: string
  quantity: string
}

interface AddComboSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
}

function parsePrice(value: number | string): number {
  return typeof value === 'string' ? Number(value) : value
}

export function AddComboSheet({
  open,
  onOpenChange,
  kitchenId,
}: AddComboSheetProps) {
  const { upload } = useKitchenUpload('combos')
  const brands = useMenuBrandOptions()
  const queryClient = useQueryClient()

  const [menuItems, setMenuItems] = useState<MenuItemPick[]>([])
  const [brandOverride, setBrandOverride] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [pricingType, setPricingType] = useState<'fixed' | 'discounted'>('fixed')
  const [price, setPrice] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [lines, setLines] = useState<ComboLine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const brandId =
    brandOverride != null && brands.some((brand) => brand.id === brandOverride)
      ? brandOverride
      : brands[0]?.id ?? ''

  const menuIds = useMemo(() => menuItems.map((item) => item.id), [menuItems])
  const menuLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of menuItems) map.set(item.id, item.name)
    return map
  }, [menuItems])
  const menuPriceById = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of menuItems) map.set(item.id, parsePrice(item.price))
    return map
  }, [menuItems])

  const parsedPrice = Number.parseFloat(price)
  const itemsTotal = useMemo(() => {
    let total = 0

    for (const line of lines) {
      if (!line.menu_item_id) continue
      const itemPrice = menuPriceById.get(line.menu_item_id) ?? 0
      const quantity = Number.parseFloat(line.quantity)
      if (Number.isFinite(quantity) && quantity > 0) {
        total += itemPrice * quantity
      }
    }

    return total
  }, [lines, menuPriceById])

  const discountedPriceInvalid =
    pricingType === 'discounted' &&
    itemsTotal > 0 &&
    Number.isFinite(parsedPrice) &&
    parsedPrice >= itemsTotal

  useEffect(() => {
    if (!open || !brandId) return

    fetchMenuItemPicksForBrand(kitchenId, brandId)
      .then((items) => setMenuItems(items))
      .catch(() => setError('Failed to load menu items.'))
  }, [open, kitchenId, brandId])

  function resetForm() {
    setBrandOverride(null)
    setName('')
    setPricingType('fixed')
    setPrice('')
    setFile(null)
    setLines([])
    setError(null)
    setMenuItems([])
  }

  function handleOpenChange(next: boolean) {
    if (pending) return
    if (!next) resetForm()
    onOpenChange(next)
  }

  function addLine() {
    setLines((current) => [
      ...current,
      { key: crypto.randomUUID(), menu_item_id: '', quantity: '1' },
    ])
  }

  function updateLine(index: number, patch: Partial<ComboLine>) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line
      )
    )
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!brandId) return setError('Select a brand.')
    if (!name.trim()) return setError('Name is required.')
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return setError('Enter a valid price (0 or greater).')
    }

    const seen = new Set<string>()
    const items: { menu_item_id: string; quantity: number }[] = []

    for (const line of lines) {
      if (!line.menu_item_id) continue
      if (seen.has(line.menu_item_id)) {
        return setError('Each menu item can only appear once in a combo.')
      }
      seen.add(line.menu_item_id)

      const quantity = Number.parseFloat(line.quantity)
      if (Number.isNaN(quantity) || quantity <= 0) {
        return setError('All quantities must be greater than 0.')
      }

      items.push({
        menu_item_id: line.menu_item_id,
        quantity,
      })
    }

    if (items.length === 0) {
      return setError('Add at least one combo item before saving.')
    }

    if (discountedPriceInvalid) {
      return setError(
        `Discounted combo price must be less than the items total (${itemsTotal.toFixed(3)}).`
      )
    }

    startTransition(async () => {
      try {
        let imageUrl: string | null = null

        if (file) {
          imageUrl = await upload(file)
          if (!imageUrl) {
            return setError(
              'Something went wrong uploading the image. Please try again.'
            )
          }
        }

        const result = await createCombo({
          kitchen_id: kitchenId,
          brand_id: brandId,
          name: name.trim(),
          image_url: imageUrl,
          pricing_type: pricingType,
          price: parsedPrice,
          items,
        })

        if (result instanceof Error) return setError(mapMenuDbError(result))

        resetForm()
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: COMBOS_QUERY_KEY })
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        className="sm:max-w-5xl"
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>Add combo</SheetTitle>
          <SheetDescription>
            Create a combo and its initial item list in one save.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            <FieldGroup>
              <MenuBrandField
                id="add-combo-brand"
                value={brandId}
                onValueChange={(nextBrandId) => {
                  setBrandOverride(nextBrandId)
                  setLines([])
                }}
                disabled={pending || brands.length === 0}
              />
              <Field>
                <FieldLabel htmlFor="add-combo-name">Name</FieldLabel>
                <Input
                  id="add-combo-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={pending}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Pricing type</FieldLabel>
                <Select
                  value={pricingType}
                  onValueChange={(nextValue) =>
                    setPricingType(nextValue as 'fixed' | 'discounted')
                  }
                  disabled={pending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="discounted">Discounted</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Discounted combos must price below the total of their items.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="add-combo-price">Price</FieldLabel>
                <Input
                  id="add-combo-price"
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  disabled={pending}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="add-combo-image">Image</FieldLabel>
                <Input
                  id="add-combo-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={pending}
                />
              </Field>
            </FieldGroup>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Combo items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              disabled={pending}
            >
              <PlusIcon />
              Add item
            </Button>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col />
                <col className="w-24" />
                <col className="w-12" />
              </colgroup>
              <thead className="bg-background">
                <tr className="border-b">
                  <th className="py-2 pl-4 pr-2 text-left font-medium text-muted-foreground">
                    Menu item
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-muted-foreground">
                    Qty
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="h-32 px-4 text-center text-muted-foreground"
                    >
                      No combo items yet. Add at least one item before saving.
                    </td>
                  </tr>
                ) : (
                  lines.map((line, index) => (
                    <tr key={line.key} className="border-b">
                      <td className="py-1.5 pl-4 pr-2">
                        <Combobox
                          items={menuIds}
                          value={line.menu_item_id || null}
                          onValueChange={(nextValue) =>
                            updateLine(index, {
                              menu_item_id: nextValue ?? '',
                            })
                          }
                          modal
                          itemToStringLabel={(id) =>
                            menuLabelById.get(String(id)) ?? ''
                          }
                        >
                          <ComboboxInput
                            placeholder="Select menu item"
                            className="w-full"
                          />
                          <ComboboxContent className="z-100 pointer-events-auto">
                            <ComboboxEmpty>No active menu items.</ComboboxEmpty>
                            <ComboboxList>
                              {(id: string) => (
                                <ComboboxItem key={id} value={id}>
                                  {menuLabelById.get(id) ?? id}
                                </ComboboxItem>
                              )}
                            </ComboboxList>
                          </ComboboxContent>
                        </Combobox>
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(index, { quantity: e.target.value })
                          }
                          placeholder="1"
                          disabled={pending}
                        />
                      </td>
                      <td className="py-1.5 pl-1 pr-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => removeLine(index)}
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

          {pricingType === 'discounted' && itemsTotal > 0 && (
            <div className="text-xs text-muted-foreground">
              Items total:{' '}
              <span className="font-medium">{itemsTotal.toFixed(3)}</span>
              {discountedPriceInvalid && (
                <span className="ml-2 text-destructive">
                  combo price must be less than this total
                </span>
              )}
            </div>
          )}
          </div>

          {error && <FieldError>{error}</FieldError>}

          <SheetFooter>
            <Button
              type="submit"
              disabled={pending || brands.length === 0 || !brandId}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Add combo
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
