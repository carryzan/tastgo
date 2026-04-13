'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { createCombo } from '../_lib/combo-actions'
import { COMBOS_QUERY_KEY } from '../_lib/queries'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MenuBrandField, useMenuBrandOptions } from './menu-brand-field'

interface AddComboDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kitchenId: string
}

export function AddComboDialog({
  open,
  onOpenChange,
  kitchenId,
}: AddComboDialogProps) {
  const { upload } = useKitchenUpload('combos')
  const queryClient = useQueryClient()
  const brands = useMenuBrandOptions()
  const [brandOverride, setBrandOverride] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [pricingType, setPricingType] = useState<'fixed' | 'discounted'>('fixed')
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
      setFile(null)
      setPricingType('fixed')
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
    if (!brandId) return setError('Select a brand.')
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

        const result = await createCombo({
          kitchen_id: kitchenId,
          brand_id: brandId,
          name,
          image_url,
          pricing_type: pricingType,
          price,
        })
        if (result instanceof Error) return setError(result.message)

        form.reset()
        setFile(null)
        setPricingType('fixed')
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: COMBOS_QUERY_KEY })
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
          <DialogTitle>Add combo</DialogTitle>
          <DialogDescription>Bundle menu items with combo pricing.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <MenuBrandField
              id="add-combo-brand"
              value={brandId}
              onValueChange={setBrandOverride}
              disabled={pending || brands.length === 0}
            />
            <Field>
              <FieldLabel htmlFor="add-combo-name">Name</FieldLabel>
              <Input id="add-combo-name" name="name" required />
            </Field>
            <Field>
              <FieldLabel>Pricing type</FieldLabel>
              <Select
                value={pricingType}
                onValueChange={(v) =>
                  setPricingType(v as 'fixed' | 'discounted')
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-100">
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="discounted">Discounted</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                Discounted combos should price below the sum of item prices.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="add-combo-price">Price</FieldLabel>
              <Input
                id="add-combo-price"
                name="price"
                type="text"
                inputMode="decimal"
                required
                placeholder="0.00"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-combo-image">Image</FieldLabel>
              <Input
                id="add-combo-image"
                type="file"
                accept="image/*"
                onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
              />
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
              disabled={pending || brands.length === 0 || !brandId}
              className="min-w-28"
            >
              {pending && <Spinner data-icon="inline-start" />}
              Add combo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
