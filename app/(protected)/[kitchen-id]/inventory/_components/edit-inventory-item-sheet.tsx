'use client'

import { useEffect, useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { updateInventoryItem } from '../_lib/item-actions'
import {
  getItemOpeningBalance,
  createOpeningBalance,
  deleteOpeningBalance,
  type OpeningBalance,
} from '../_lib/opening-balance-actions'
import { Button } from '@/components/ui/button'
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
import { InventoryItemForm, parseFormValues } from './inventory-item-form'
import { OpeningBalanceSection } from './opening-balance-section'
import type { InventoryItem } from './columns'
import { INVENTORY_QUERY_KEY } from '../_lib/queries'
import type { InventoryCategory } from '../_lib/inventory-categories'

interface EditInventoryItemSheetProps {
  item: InventoryItem
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: InventoryCategory[]
}

export function EditInventoryItemSheet({
  item,
  open,
  onOpenChange,
  categories,
}: EditInventoryItemSheetProps) {
  const { kitchen, kitchenSettings, membership } = useKitchen()
  const { upload, remove } = useKitchenUpload('inventory')
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const openingDate =
    kitchenSettings && typeof kitchenSettings.opening_inventory_date === 'string'
      ? kitchenSettings.opening_inventory_date
      : null
  const showOB =
    kitchenSettings?.opening_inventory_completed !== true && !!openingDate

  const [balance, setBalance] = useState<OpeningBalance | null>(null)
  const [balanceLoaded, setBalanceLoaded] = useState(false)
  const [removeBalance, setRemoveBalance] = useState(false)

  useEffect(() => {
    if (!open || !showOB) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setBalanceLoaded(false)
      void getItemOpeningBalance(kitchen.id, item.id).then((result) => {
        if (cancelled) return
        if (!(result instanceof Error)) setBalance(result)
        setBalanceLoaded(true)
      })
    })
    return () => {
      cancelled = true
    }
  }, [open, item.id, kitchen.id, showOB])

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setFile(null)
      setRemoveImage(false)
      setBalance(null)
      setBalanceLoaded(false)
      setRemoveBalance(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const values = parseFormValues(form)

    if (!values.name) return

    startTransition(async () => {
      try {
        let image_url: string | null | undefined = undefined

        if (file) {
          image_url = await upload(file, item.image_url)
          if (!image_url) {
            return setError('Something went wrong uploading the image. Please try again.')
          }
        } else if (removeImage && item.image_url) {
          await remove(item.image_url)
          image_url = null
        }

        const updates: Record<string, unknown> = {}
        if (values.name !== item.name) updates.name = values.name
        if (values.category_id !== item.category_id) updates.category_id = values.category_id
        if (values.yield_percentage !== item.yield_percentage) updates.yield_percentage = values.yield_percentage
        if (values.par_level !== item.par_level) updates.par_level = values.par_level
        if (values.min_level !== item.min_level) updates.min_level = values.min_level
        if (values.max_level !== item.max_level) updates.max_level = values.max_level
        if (values.cycle_count_frequency !== item.cycle_count_frequency) updates.cycle_count_frequency = values.cycle_count_frequency
        if (values.location_label !== item.location_label) updates.location_label = values.location_label
        if (image_url !== undefined) updates.image_url = image_url

        if (Object.keys(updates).length > 0) {
          const result = await updateInventoryItem(item.id, updates)
          if (result instanceof Error) return setError(result.message)
        }

        if (removeBalance && balance?.id) {
          const delResult = await deleteOpeningBalance(balance.id)
          if (delResult instanceof Error) return setError(delResult.message)
        } else if (!balance && showOB && openingDate) {
          const fd = new FormData(form)
          const obQty = parseFloat(fd.get('ob_quantity') as string)
          const obCost = parseFloat(fd.get('ob_unit_cost') as string)
          if (obQty > 0 && obCost > 0) {
            const obResult = await createOpeningBalance({
              kitchen_id: kitchen.id,
              inventory_item_id: item.id,
              quantity: obQty,
              unit_cost: obCost,
              as_of_date: openingDate,
              created_by: (membership as unknown as { id: string }).id,
            })
            if (obResult instanceof Error) return setError(obResult.message)
          }
        }

        setFile(null)
        setRemoveImage(false)
        setBalance(null)
        setRemoveBalance(false)
        onOpenChange(false)
        queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY })
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
          <SheetTitle>Edit Item</SheetTitle>
          <SheetDescription>
            Update the details for this inventory item.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <InventoryItemForm
            categories={categories}
            defaultValues={{
              id: item.id,
              name: item.name,
              category_id: item.category_id,
              image_url: item.image_url,
              yield_percentage: item.yield_percentage,
              par_level: item.par_level,
              min_level: item.min_level,
              max_level: item.max_level,
              cycle_count_frequency: item.cycle_count_frequency,
              location_label: item.location_label,
            }}
            file={file}
            onFileChange={setFile}
            removeImage={removeImage}
            onRemoveImageChange={setRemoveImage}
            error={error}
            afterFields={
              showOB && balanceLoaded && openingDate ? (
                <OpeningBalanceSection
                  balance={balance}
                  removeBalance={removeBalance}
                  onRemoveBalanceChange={setRemoveBalance}
                />
              ) : undefined
            }
          >
            <SheetFooter>
              <Button type="submit" disabled={pending} className="min-w-28">
                {pending && <Spinner data-icon="inline-start" />}
                Save Changes
              </Button>
              <SheetClose asChild>
                <Button variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </InventoryItemForm>
        </form>
      </SheetContent>
    </Sheet>
  )
}
