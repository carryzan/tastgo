'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useKitchen } from '@/hooks/use-kitchen'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { updateShiftAssignment } from '../_lib/assignment-actions'
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../_lib/datetime'
import { SHIFT_ASSIGNMENTS_QUERY_KEY, type ShiftAssignment } from '../_lib/queries'

interface AttendanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: ShiftAssignment | null
  mode: 'check-in' | 'check-out'
}

function getNowLocalValue() {
  return toDateTimeLocalValue(new Date().toISOString())
}

export function AttendanceDialog({
  open,
  onOpenChange,
  assignment,
  mode,
}: AttendanceDialogProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [timestamp, setTimestamp] = useState(
    mode === 'check-in'
      ? toDateTimeLocalValue(assignment?.checked_in_at) || getNowLocalValue()
      : toDateTimeLocalValue(assignment?.checked_out_at) || getNowLocalValue()
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!assignment) return
    if (!timestamp) return setError('Enter an attendance timestamp.')

    startTransition(async () => {
      const result = await updateShiftAssignment(kitchen.id, assignment.id, {
        shift_id: assignment.shift_id,
        staff_member_id: assignment.staff_member_id,
        checked_in_at:
          mode === 'check-in'
            ? fromDateTimeLocalValue(timestamp)
            : assignment.checked_in_at,
        checked_out_at:
          mode === 'check-out'
            ? fromDateTimeLocalValue(timestamp)
            : assignment.checked_out_at,
      })

      if (result instanceof Error) {
        setError(result.message)
        return
      }

      queryClient.invalidateQueries({ queryKey: SHIFT_ASSIGNMENTS_QUERY_KEY })
      onOpenChange(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'check-in' ? 'Check in' : 'Check out'}</DialogTitle>
          <DialogDescription>
            {assignment?.staff_member?.full_name ?? 'This staff member'} will be{' '}
            {mode === 'check-in' ? 'checked in' : 'checked out'} against the selected shift.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="grid gap-2">
              <FieldLabel htmlFor="attendance-timestamp">Timestamp</FieldLabel>
              <Input
                id="attendance-timestamp"
                type="datetime-local"
                value={timestamp}
                onChange={(event) => setTimestamp(event.target.value)}
                disabled={pending}
              />
            </div>
          </FieldGroup>

          {error ? <FieldError className="mt-4">{error}</FieldError> : null}

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="min-w-28">
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {mode === 'check-in' ? 'Check In' : 'Check Out'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
