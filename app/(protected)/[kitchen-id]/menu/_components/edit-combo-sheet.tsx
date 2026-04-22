'use client'

import { useMemo, useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { updateCombo } from '../_lib/combo-actions'
import { COMBOS_QUERY_KEY } from '../_lib/queries'
import { mapMenuDbError } from '../_lib/db-errors'
import type { Combo } from './combo-columns'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface EditComboSheetProps {
  combo: Combo
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditComboSheet({
  combo,
  open,
  onOpenChange,
}: EditComboSheetProps) {
  const { upload, remove } = useKitchenUpload('combos')
  const kitchenBrands = useMenuBrandOptions()
  const queryClient = useQueryClient()
  const hasItems = (combo.combo_items?.length ?? 0) > 0
  const [brandId, setBrandId] = useState(combo.brand_id)
  const [name, setName] = useState(combo.name)
  const [pricingType, setPricingType] = useState<'fixed' | 'discounted'>(
    combo.pricing_type
  )
  const [price, setPrice] = useState(
    typeof combo.price === 'string' ? combo.price : String(combo.price)
  )
  const [comboActive, setComboActive] = useState(combo.is_active)
  const [file, setFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Compute the items total from embedded combo_items so we can validate
  // discounted pricing without a round-trip.
  const itemsTotal = useMemo(() => {
    let total = 0
    for (const ci of combo.combo_items ?? []) {
      const itemPrice =
        typeof ci.menu_items?.price === 'string'
          ? Number(ci.menu_items.price)
          : (ci.menu_items?.price ?? 0)
      const qty =
        typeof ci.quantity === 'string' ? Number(ci.quantity) : (ci.quantity ?? 1)
      if (Number.isFinite(itemPrice) && Number.isFinite(qty)) {
        total += itemPrice * qty
      }
    }
    return total
  }, [combo.combo_items])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) return setError('Name is required.')

    const priceNum = Number.parseFloat(price)
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return setError('Enter a valid price.')
    }

    if (pricingType === 'discounted' && itemsTotal > 0 && priceNum >= itemsTotal) {
      return setError(
        `Discounted price must be less than the items total (${itemsTotal.toFixed(3)}).`
      )
    }

    startTransition(async () => {
      try {
        let image_url: string | null | undefined = undefined
        if (file) {
          image_url = await upload(file, combo.image_url)
          if (!image_url) {
            return setError(
              'Something went wrong uploading the image. Please try again.'
            )
          }
        } else if (removeImage && combo.image_url) {
          await remove(combo.image_url)
          image_url = null
        }

        const updates: Parameters<typeof updateCombo>[2] = {}
        if (name.trim() !== combo.name) updates.name = name.trim()
        if (brandId !== combo.brand_id) updates.brand_id = brandId
        if (pricingType !== combo.pricing_type) updates.pricing_type = pricingType
        const prevPrice =
          typeof combo.price === 'string' ? Number(combo.price) : combo.price
        if (priceNum !== prevPrice) updates.price = priceNum
        if (comboActive !== combo.is_active) updates.is_active = comboActive
        if (image_url !== undefined) updates.image_url = image_url

        if (Object.keys(updates).length > 0) {
          const u = await updateCombo(combo.id, combo.kitchen_id, updates)
          if (u instanceof Error) return setError(mapMenuDbError(u))
        }

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
        showCloseButton={!pending}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault()
        }}
      >
        <SheetHeader>
          <SheetTitle>Edit combo</SheetTitle>
          <SheetDescription>
            Update details for {combo.name}.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="grid flex-1 auto-rows-min gap-6 px-4">
            <FieldGroup>
              <MenuBrandField
                id="edit-combo-brand"
                value={brandId}
                onValueChange={setBrandId}
                disabled={pending || kitchenBrands.length === 0}
              />
              <Field>
                <FieldLabel htmlFor="ec-name">Name</FieldLabel>
                <Input
                  id="ec-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Pricing type</FieldLabel>
                <Select
                  value={pricingType}
                  onValueChange={(v) =>
                    setPricingType(v as 'fixed' | 'discounted')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-100">
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="discounted">Discounted</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="ec-price">Price</FieldLabel>
                <Input
                  id="ec-price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                {pricingType === 'discounted' && itemsTotal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Must be less than items total:{' '}
                    <span className="font-medium">{itemsTotal.toFixed(3)}</span>
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="ec-img">Replace image</FieldLabel>
                <Input
                  id="ec-img"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {combo.image_url && (
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox
                      id="ec-rm"
                      checked={removeImage}
                      onCheckedChange={(c) => setRemoveImage(c === true)}
                    />
                    <Label htmlFor="ec-rm" className="text-sm font-normal">
                      Remove current image
                    </Label>
                  </div>
                )}
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="ec-active">Active</FieldLabel>
                  {!hasItems && !comboActive ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Switch
                            id="ec-active"
                            checked={comboActive}
                            onCheckedChange={setComboActive}
                            disabled
                            aria-disabled
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Add at least one item before activating this combo.
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Switch
                      id="ec-active"
                      checked={comboActive}
                      onCheckedChange={setComboActive}
                    />
                  )}
                </div>
                {!hasItems && (
                  <p className="text-xs text-muted-foreground">
                    No items yet. Use &quot;Manage Items&quot; to add one before
                    activating this combo.
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
