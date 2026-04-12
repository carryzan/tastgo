'use client'
import { useState, useTransition } from 'react'
import { useKitchen } from '@/hooks/use-kitchen'
import { updateUOM } from '@/lib/actions/units-of-measure'
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

interface UOM {
  id: string
  name: string
  abbreviation: string
}

export function EditUOM({
  uom,
  open,
  onOpenChange,
}: {
  uom: UOM
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { unitsOfMeasure } = useKitchen()
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

    const form = e.currentTarget
    const formData = new FormData(form)
    const name = formData.get('name') as string
    const abbreviation = formData.get('abbreviation') as string
    if (!name || !abbreviation) return

    const uoms = unitsOfMeasure as UOM[]
    if (uoms.some((u) => u.id !== uom.id && u.name.toLowerCase() === name.toLowerCase())) {
      return setError('A unit with this name already exists.')
    }
    if (uoms.some((u) => u.id !== uom.id && u.abbreviation.toLowerCase() === abbreviation.toLowerCase())) {
      return setError('A unit with this abbreviation already exists.')
    }

    startTransition(async () => {
      try {
        const updates: { name?: string; abbreviation?: string } = {}
        if (name !== uom.name) updates.name = name
        if (abbreviation !== uom.abbreviation) updates.abbreviation = abbreviation

        if (Object.keys(updates).length > 0) {
          const result = await updateUOM(uom.id, updates)
          if (result instanceof Error) return setError(result.message)
        }

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
          <DialogTitle>Edit Unit of Measure</DialogTitle>
          <DialogDescription>Update your unit details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="uom-name">Name</FieldLabel>
              <Input
                id="uom-name"
                name="name"
                placeholder="e.g. Kilogram"
                defaultValue={uom.name}
                required
              />
              <FieldDescription>The full name of the unit.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="uom-abbreviation">Abbreviation</FieldLabel>
              <Input
                id="uom-abbreviation"
                name="abbreviation"
                placeholder="e.g. kg"
                defaultValue={uom.abbreviation}
                required
              />
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
