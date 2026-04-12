'use client'
import { useState, useTransition } from 'react'
import { useKitchen } from '@/hooks/use-kitchen'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { updateSource } from '@/lib/actions/sources'
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Source {
  id: string
  name: string
  type: string
  logo_url: string | null
}

export function EditSource({ source, open, onOpenChange }: { source: Source; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { sources } = useKitchen()
  const { upload } = useKitchenUpload('sources')
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
    const formData = new FormData(form)
    const name = formData.get('name') as string
    const type = formData.get('type') as string
    if (!name) return

    const exists = (sources as Source[]).some(
      (s) => s.id !== source.id && s.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) {
      setError('A source with this name already exists.')
      return
    }

    startTransition(async () => {
      try {
        let logo_url: string | null | undefined = undefined
        if (file) {
          logo_url = await upload(file, source.logo_url)
          if (!logo_url) {
            setError('Something went wrong uploading your logo. Please try again.')
            return
          }
        }

        const updates: { name?: string; type?: string; logo_url?: string | null } = {}
        if (name !== source.name) updates.name = name
        if (type !== source.type) updates.type = type
        if (logo_url !== undefined) updates.logo_url = logo_url

        if (Object.keys(updates).length > 0) {
          const result = await updateSource(source.id, updates)
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
          <DialogTitle>Edit Source</DialogTitle>
          <DialogDescription>Update your source details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="source-name">Name</FieldLabel>
              <Input
                id="source-name"
                name="name"
                placeholder="Source name"
                defaultValue={source.name}
                required
              />
              <FieldDescription>
                The name visible across your kitchen.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Select name="type" defaultValue={source.type}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>Online for delivery apps, offline for in-person.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="source-logo">Logo</FieldLabel>
              <Input
                id="source-logo"
                name="logo"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <FieldDescription>
                {source.logo_url
                  ? 'Upload a new image to replace the current logo.'
                  : 'Upload a logo for this source.'}
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
