'use client'
import { useState, useTransition } from 'react'
import { useKitchen } from '@/hooks/use-kitchen'
import { createUOM } from '@/lib/actions/units-of-measure'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface UOM {
  name: string
  abbreviation: string
}

export function AddUOM() {
  const { kitchen, unitsOfMeasure } = useKitchen()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const name = formData.get('name') as string
    const abbreviation = formData.get('abbreviation') as string
    if (!name || !abbreviation) return

    const uoms = unitsOfMeasure as UOM[]
    if (uoms.some((u) => u.name.toLowerCase() === name.toLowerCase())) {
      return setError('A unit with this name already exists.')
    }
    if (uoms.some((u) => u.abbreviation.toLowerCase() === abbreviation.toLowerCase())) {
      return setError('A unit with this abbreviation already exists.')
    }

    startTransition(async () => {
      try {
        const result = await createUOM({ kitchen_id: kitchen.id, name, abbreviation })
        if (result instanceof Error) return setError(result.message)
        form.reset()
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
        <Button>Add Unit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm" onInteractOutside={blockClose} onEscapeKeyDown={blockClose}>
        <DialogHeader>
          <DialogTitle>Add Unit of Measure</DialogTitle>
          <DialogDescription>Create a new unit of measure for your kitchen.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="uom-name">Name</FieldLabel>
              <Input id="uom-name" name="name" placeholder="e.g. Kilogram" required />
              <FieldDescription>The full name of the unit.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="uom-abbreviation">Abbreviation</FieldLabel>
              <Input id="uom-abbreviation" name="abbreviation" placeholder="e.g. kg" required />
              <FieldDescription>A short symbol used across your kitchen.</FieldDescription>
            </Field>
          </FieldGroup>
          {error && <FieldError className="mt-2">{error}</FieldError>}
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={pending}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending && <Spinner data-icon="inline-start" />}
              Add Unit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
