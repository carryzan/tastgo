'use client'
import { useTransition } from 'react'
import { useKitchen } from '@/hooks/use-kitchen'
import { deleteSourceFee } from '@/lib/actions/source-fees'
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

interface SourceFee {
  id: string
  source_id: string
  commission_rate: number
  commission_basis: 'before_discount' | 'after_discount'
  fixed_fee: number
  effective_from: string
}

export function DeleteFee({ fee, open, onOpenChange }: { fee: SourceFee; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { sources } = useKitchen()
  const [pending, startTransition] = useTransition()

  const sourceName = (sources as { id: string; name: string }[]).find((s) => s.id === fee.source_id)?.name ?? '—'

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSourceFee(fee.id)
      if (result instanceof Error) return
      onOpenChange(false)
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
          <AlertDialogTitle>Delete fee for {sourceName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this fee. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={pending} className="min-w-20">
            {pending && <Spinner data-icon="inline-start" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}