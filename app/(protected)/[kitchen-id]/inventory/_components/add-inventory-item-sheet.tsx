'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { createInventoryItem } from '../_lib/item-actions'
import { createOpeningBalance } from '../_lib/opening-balance-actions'
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
import { INVENTORY_QUERY_KEY } from '../_lib/queries'
import type { InventoryCategory } from '../_lib/inventory-categories'

interface AddInventoryItemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: InventoryCategory[]
}

export function AddInventoryItemSheet({
  open,
  onOpenChange,
  categories,
}: AddInventoryItemSheetProps) {
  const { kitchen, kitchenSettings, membership } = useKitchen()
  const { upload } = useKitchenUpload('inventory')
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const openingDate =
    kitchenSettings && typeof kitchenSettings.opening_inventory_date === 'string'
      ? kitchenSettings.opening_inventory_date
      : null
  const showOpeningBalance =
    kitchenSettings?.opening_inventory_completed !== true && !!openingDate

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) {
      setError(null)
      setFile(null)
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
        let image_url: string | null = null
        if (file) {
          image_url = await upload(file)
          if (!image_url) {
            return setError('Something went wrong uploading the image. Please try again.')
          }
        }

        const result = await createInventoryItem({
          kitchen_id: kitchen.id,
          ...values,
          image_url,
        })

        if (result instanceof Error) return setError(result.message)

        if (showOpeningBalance && openingDate) {
          const fd = new FormData(form)
          const obQty = parseFloat(fd.get('ob_quantity') as string)
          const obCost = parseFloat(fd.get('ob_unit_cost') as string)
          if (obQty > 0 && obCost > 0) {
            const obResult = await createOpeningBalance({
              kitchen_id: kitchen.id,
              inventory_item_id: result,
              quantity: obQty,
              unit_cost: obCost,
              as_of_date: openingDate,
              created_by: (membership as unknown as { id: string }).id,
            })
            if (obResult instanceof Error) return setError(obResult.message)
          }
        }

        form.reset()
        setFile(null)
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
          <SheetTitle>Add Item</SheetTitle>
          <SheetDescription>
            Add a new inventory item to your kitchen.
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <InventoryItemForm
            categories={categories}
            file={file}
            onFileChange={setFile}
            removeImage={false}
            onRemoveImageChange={() => {}}
            error={error}
            afterFields={
              showOpeningBalance ? (
                <OpeningBalanceSection
                  removeBalance={false}
                  onRemoveBalanceChange={() => {}}
                />
              ) : undefined
            }
          >
            <SheetFooter>
              <Button type="submit" disabled={pending} className="min-w-28">
                {pending && <Spinner data-icon="inline-start" />}
                Add Item
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
