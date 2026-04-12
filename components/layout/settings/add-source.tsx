'use client'
import { useState, useTransition } from 'react'
import { useKitchen } from '@/hooks/use-kitchen'
import { useKitchenUpload } from '@/hooks/use-kitchen-upload'
import { createSource } from '@/lib/actions/sources'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AddSource() {
  const { kitchen, sources } = useKitchen()
  const { upload } = useKitchenUpload('sources')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const name = formData.get('name') as string
    const type = formData.get('type') as string
    if (!name) return

    if ((sources as { name: string }[]).some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      return setError('A source with this name already exists.')
    }

    startTransition(async () => {
      try {
        const logo_url = file ? await upload(file) : null
        if (file && !logo_url) {
          return setError('Something went wrong uploading your logo. Please try again.')
        }

        const result = await createSource({ kitchen_id: kitchen.id, name, type, logo_url })
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
        <Button>Add Source</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" onInteractOutside={blockClose} onEscapeKeyDown={blockClose}>
        <DialogHeader>
          <DialogTitle>Add Source</DialogTitle>
          <DialogDescription>Create a new order source for your kitchen.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="source-name">Name</FieldLabel>
              <Input id="source-name" name="name" placeholder="Source name" required />
              <FieldDescription>The name visible across your kitchen.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Type</FieldLabel>
              <Select name="type" defaultValue="online">
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
              <FieldDescription>Upload a logo for this source.</FieldDescription>
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Add Source
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
