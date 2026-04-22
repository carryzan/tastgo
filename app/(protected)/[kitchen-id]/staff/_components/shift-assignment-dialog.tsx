'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  fetchActiveStaffMembers,
  fetchWorkShifts,
} from '../_lib/client-queries'
import {
  createShiftAssignment,
  updateShiftAssignment,
} from '../_lib/assignment-actions'
import { SHIFT_ASSIGNMENTS_QUERY_KEY, type ShiftAssignment } from '../_lib/queries'

interface ShiftAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment?: ShiftAssignment | null
  canReadStaff: boolean
}

export function ShiftAssignmentDialog({
  open,
  onOpenChange,
  assignment,
  canReadStaff,
}: ShiftAssignmentDialogProps) {
  const { kitchen } = useKitchen()
  const queryClient = useQueryClient()
  const [shiftId, setShiftId] = useState(assignment?.shift_id ?? '')
  const [staffMemberId, setStaffMemberId] = useState(assignment?.staff_member_id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const { data: shifts = [] } = useQuery({
    queryKey: ['work-shifts-picker', kitchen.id],
    queryFn: () => fetchWorkShifts(kitchen.id),
    enabled: open,
  })
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['staff-members-picker', kitchen.id],
    queryFn: () => fetchActiveStaffMembers(kitchen.id),
    enabled: open && canReadStaff,
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!canReadStaff) {
      setError('This role cannot read staff records, so assignments cannot be edited here.')
      return
    }
    if (!shiftId) return setError('Select a shift.')
    if (!staffMemberId) return setError('Select a staff member.')

    startTransition(async () => {
      const payload = {
        shift_id: shiftId,
        staff_member_id: staffMemberId,
        checked_in_at: assignment?.checked_in_at ?? null,
        checked_out_at: assignment?.checked_out_at ?? null,
      }

      const result = assignment
        ? await updateShiftAssignment(kitchen.id, assignment.id, payload)
        : await createShiftAssignment(kitchen.id, payload)

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
          <DialogTitle>{assignment ? 'Edit assignment' : 'Assign staff'}</DialogTitle>
          <DialogDescription>
            Assign staff to a shift. Overlapping assignments are blocked by the database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Shift</FieldLabel>
              <Select value={shiftId} onValueChange={setShiftId} disabled={pending}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {shift.name} ·{' '}
                      {new Date(`${shift.shift_date}T00:00:00`).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Staff Member</FieldLabel>
              <Select
                value={staffMemberId}
                onValueChange={setStaffMemberId}
                disabled={pending || !canReadStaff}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((staffMember) => (
                    <SelectItem key={staffMember.id} value={staffMember.id}>
                      {staffMember.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canReadStaff ? (
                <FieldDescription>
                  Staff details are not readable for this role, so only shift management is available.
                </FieldDescription>
              ) : null}
            </Field>
          </FieldGroup>

          {error ? <FieldError className="mt-4">{error}</FieldError> : null}

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || !canReadStaff} className="min-w-28">
              {pending ? <Spinner data-icon="inline-start" /> : null}
              {assignment ? 'Save Changes' : 'Assign Staff'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
