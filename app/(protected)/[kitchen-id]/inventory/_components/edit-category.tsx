'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateInventoryCategory } from '../_lib/category-actions'
import type { InventoryCategory } from '../_lib/inventory-categories'
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

interface EditCategoryProps {
  kitchenId: string
  categories: InventoryCategory[]
  category: Pick<InventoryCategory, 'id' | 'name'>
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCategory({
  kitchenId,
  categories,
  category,
  open,
  onOpenChange,
}: EditCategoryProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (pending) return
    onOpenChange(next)
    if (!next) setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const name = new FormData(e.currentTarget).get('name') as string
    if (!name) return

    const exists = categories.some(
      (c) => c.id !== category.id && c.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) return setError('A category with this name already exists.')

    if (name === category.name) {
      onOpenChange(false)
      return
    }

    startTransition(async () => {
      try {
        const result = await updateInventoryCategory(category.id, kitchenId, {
          name,
        })
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
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>Update the category name.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-category-name">Name</FieldLabel>
              <Input
                id="edit-category-name"
                name="name"
                placeholder="Category name"
                defaultValue={category.name}
                required
              />
            </Field>
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
