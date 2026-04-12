'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { updateInventoryItem } from '../_lib/item-actions'
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
  const { upload, remove } = useKitchenUpload('inventory')
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

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

        setFile(null)
        setRemoveImage(false)
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
