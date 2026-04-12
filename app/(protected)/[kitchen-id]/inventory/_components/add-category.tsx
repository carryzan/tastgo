'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInventoryCategory } from '../_lib/category-actions'
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface AddCategoryProps {
  kitchenId: string
  categories: InventoryCategory[]
}

export function AddCategory({ kitchenId, categories }: AddCategoryProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const name = new FormData(form).get('name') as string
    if (!name) return

    const exists = categories.some(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) return setError('A category with this name already exists.')

    startTransition(async () => {
      try {
        const result = await createInventoryCategory({
          kitchen_id: kitchenId,
          name,
        })
        if (result instanceof Error) return setError(result.message)
        form.reset()
        setOpen(false)
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const blockClose = (e: { preventDefault(): void }) => {
    if (pending) e.preventDefault()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!pending) {
          setOpen(v)
          if (!v) setError(null)
        }
      }}
    >
      <Button onClick={() => setOpen(true)}>Add Category</Button>
      <DialogContent
        className="sm:max-w-sm"
        onInteractOutside={blockClose}
        onEscapeKeyDown={blockClose}
      >
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>
            Create a new inventory category for your kitchen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="add-category-name">Name</FieldLabel>
              <Input
                id="add-category-name"
                name="name"
                placeholder="Category name"
                required
              />
              <FieldDescription>
                This name will be used to group inventory items.
              </FieldDescription>
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
              Add Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
