'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteServicePeriod } from '../_lib/service-period-actions'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteServicePeriodProps {
  kitchenId: string
  servicePeriod: { id: string; name: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteServicePeriod({
  kitchenId,
  servicePeriod,
  open,
  onOpenChange,
}: DeleteServicePeriodProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteServicePeriod(servicePeriod.id, kitchenId)
      if (result instanceof Error) return
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        onOpenChange(next)
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {servicePeriod.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this service period. Batches using it
            will become unassigned. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
            className="min-w-20"
          >
            {pending && <Spinner data-icon="inline-start" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
