'use client'
import { useState, useTransition } from 'react'
import { useKitchen } from '@/hooks/use-kitchen'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { updateBrand } from '@/lib/actions/brands'
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

interface Brand {
  id: string
  name: string
  logo_url: string | null
}

export function EditBrand({ brand, open, onOpenChange }: { brand: Brand; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { brands } = useKitchen()
  const { upload } = useKitchenUpload('brands')
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const name = new FormData(form).get('name') as string
    if (!name) return

    const exists = (brands as Brand[]).some(
      (b) => b.id !== brand.id && b.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) {
      setError('A brand with this name already exists.')
      return
    }

    startTransition(async () => {
      try {
        let logo_url: string | null | undefined = undefined
        if (file) {
          logo_url = await upload(file, brand.logo_url)
          if (!logo_url) {
            setError('Something went wrong uploading your logo. Please try again.')
            return
          }
        }

        const updates: { name?: string; logo_url?: string | null } = {}
        if (name !== brand.name) updates.name = name
        if (logo_url !== undefined) updates.logo_url = logo_url

        if (Object.keys(updates).length > 0) {
          const result = await updateBrand(brand.id, updates)
          if (result instanceof Error) {
            setError(result.message)
            return
          }
        }

        setFile(null)
        onOpenChange(false)
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        onInteractOutside={(e) => { if (pending) e.preventDefault() }}
        onEscapeKeyDown={(e) => { if (pending) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle>Edit Brand</DialogTitle>
          <DialogDescription>Update your brand details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="brand-name">Name</FieldLabel>
              <Input
                id="brand-name"
                name="name"
                placeholder="Brand name"
                defaultValue={brand.name}
                required
              />
              <FieldDescription>
                This is the name that will be displayed across your kitchen.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="brand-logo">Logo</FieldLabel>
              <Input
                id="brand-logo"
                name="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <FieldDescription>
                {brand.logo_url
                  ? 'Upload a new image to replace the current logo.'
                  : 'Upload a logo for your brand.'}
              </FieldDescription>
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>Cancel</Button>
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