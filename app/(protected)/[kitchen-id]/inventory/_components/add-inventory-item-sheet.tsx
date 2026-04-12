'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { createInventoryItem } from '../_lib/item-actions'
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
  const { kitchen } = useKitchen()
  const { upload } = useKitchenUpload('inventory')
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

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
