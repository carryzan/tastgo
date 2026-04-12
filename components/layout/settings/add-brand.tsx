'use client'
import { useState, useTransition } from 'react'
import { useKitchen } from '@/hooks/use-kitchen'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { createBrand } from '@/lib/actions/brands'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field, FieldDescription, FieldError, FieldGroup, FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function AddBrand() {
  const { kitchen, brands } = useKitchen()
  const { upload } = useKitchenUpload('brands')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const name = new FormData(form).get('name') as string
    if (!name) return

    if ((brands as { name: string }[]).some((b) => b.name.toLowerCase() === name.toLowerCase())) {
      return setError('A brand with this name already exists.')
    }

    startTransition(async () => {
      try {
        const logo_url = file ? await upload(file) : null
        if (file && !logo_url) {
          return setError('Something went wrong uploading your logo. Please try again.')
        }

        const result = await createBrand({ kitchen_id: kitchen.id, name, logo_url })
        if (result instanceof Error) return setError(result.message)

        form.reset()
        setFile(null)
        setOpen(false)
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  const blockClose = (e: { preventDefault(): void }) => { if (pending) e.preventDefault() }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!pending) { setOpen(v); if (!v) setError(null) } }}>
      <DialogTrigger asChild>
        <Button>Add Brand</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" onInteractOutside={blockClose} onEscapeKeyDown={blockClose}>
        <DialogHeader>
          <DialogTitle>Add Brand</DialogTitle>
          <DialogDescription>Create a new brand for your kitchen.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="brand-name">Name</FieldLabel>
              <Input id="brand-name" name="name" placeholder="Brand name" required />
              <FieldDescription>This is the name that will be displayed across your kitchen.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="brand-logo">Logo</FieldLabel>
              <Input id="brand-logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <FieldDescription>Upload a logo for your brand.</FieldDescription>
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Add Brand
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}