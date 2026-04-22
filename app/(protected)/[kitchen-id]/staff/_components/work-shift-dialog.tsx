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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  createWorkShift,
  updateWorkShift,
} from '../_lib/shift-actions'
import {
  combineDateAndTimeToIso,
  toTimeValue,
} from '../_lib/datetime'
import { WORK_SHIFTS_QUERY_KEY, type WorkShift } from '../_lib/queries'
import { DatePickerInput } from './date-picker-input'

interface WorkShiftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift?: WorkShift | null
}

export function WorkShiftDialog({
  open,
  onOpenChange,
  shift,
}: WorkShiftDialogProps) {
  const { kitchen, membership } = useKitchen()
  const queryClient = useQueryClient()
  const [name, setName] = useState(shift?.name ?? '')
  const [shiftDate, setShiftDate] = useState(
    shift?.shift_date ?? new Date().toISOString().split('T')[0]
  )
  const [startTime, setStartTime] = useState(toTimeValue(shift?.start_time))
  const [endTime, setEndTime] = useState(toTimeValue(shift?.end_time))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) return setError('Enter a shift name.')
    if (!shiftDate) return setError('Select the shift date.')
    if (!startTime || !endTime) return setError('Enter both start and end times.')

    const start = new Date(`${shiftDate}T${startTime}`)
    const end = new Date(`${shiftDate}T${endTime}`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return setError('Enter valid shift timestamps.')
    }

    const endsNextDay = end <= start

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        shift_date: shiftDate,
        start_time: combineDateAndTimeToIso(shiftDate, startTime),
        end_time: combineDateAndTimeToIso(shiftDate, endTime, endsNextDay ? 1 : 0),
        created_by: (membership as unknown as { id: string }).id,
      }

      const result = shift
        ? await updateWorkShift(kitchen.id, shift.id, payload)
        : await createWorkShift(kitchen.id, payload)

      if (result instanceof Error) {
        setError(result.message)
        return
      }

      queryClient.invalidateQueries({ queryKey: WORK_SHIFTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['work-shifts-picker', kitchen.id] })
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
          <DialogTitle>{shift ? 'Edit shift' : 'Add shift'}</DialogTitle>
          <DialogDescription>
            Choose the shift date and times. If the end time is earlier than the
            start time, it will be treated as the next day.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="work-shift-name">Name</FieldLabel>
              <Input
                id="work-shift-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Opening Shift"
                disabled={pending}
              />
            </Field>

            <Field>
              <FieldLabel>Shift Date</FieldLabel>
              <DatePickerInput
                value={shiftDate}
                onChange={setShiftDate}
                placeholder="Pick a date"
                disabled={pending}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="work-shift-start">Start Time</FieldLabel>
              <Input
                id="work-shift-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                disabled={pending}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="work-shift-end">End Time</FieldLabel>
              <Input
                id="work-shift-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                disabled={pending}
              />
              <FieldDescription>
                If the end time is earlier than the start time, the shift continues
                into the next day.
              </FieldDescription>
            </Field>
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
              {shift ? 'Save Changes' : 'Add Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
