'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateServicePeriod } from '../_lib/service-period-actions'
import type { ServicePeriod } from '../_lib/service-periods'
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

interface EditServicePeriodProps {
  kitchenId: string
  servicePeriods: ServicePeriod[]
  servicePeriod: Pick<ServicePeriod, 'id' | 'name'>
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditServicePeriod({
  kitchenId,
  servicePeriods,
  servicePeriod,
  open,
  onOpenChange,
}: EditServicePeriodProps) {
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

    const exists = servicePeriods.some(
      (sp) =>
        sp.id !== servicePeriod.id &&
        sp.name.toLowerCase() === name.toLowerCase()
    )
    if (exists) return setError('A service period with this name already exists.')

    if (name === servicePeriod.name) {
      onOpenChange(false)
      return
    }

    startTransition(async () => {
      try {
        const result = await updateServicePeriod(
          servicePeriod.id,
          kitchenId,
          { name }
        )
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
          <DialogTitle>Edit Service Period</DialogTitle>
          <DialogDescription>Update the service period name.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-sp-name">Name</FieldLabel>
              <Input
                id="edit-sp-name"
                name="name"
                placeholder="Service period name"
                defaultValue={servicePeriod.name}
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
