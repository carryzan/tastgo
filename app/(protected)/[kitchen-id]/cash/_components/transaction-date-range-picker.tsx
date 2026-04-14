'use client'

import * as React from 'react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { type DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface TransactionDateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}

export function TransactionDateRangePicker({
  value,
  onChange,
}: TransactionDateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 font-normal">
          <CalendarIcon className="size-3.5" />
          {value?.from ? (
            value.to ? (
              <>
                {format(value.from, 'LLL dd')} – {format(value.to, 'LLL dd, y')}
              </>
            ) : (
              format(value.from, 'LLL dd, y')
            )
          ) : (
            <span>All time</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
        />
        {value && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange(undefined)}
            >
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function filterByDateRange<T extends { created_at: string }>(
  items: T[],
  range: DateRange | undefined
): T[] {
  if (!range?.from) return items
  const from = startOfDay(range.from).getTime()
  const to = range.to ? endOfDay(range.to).getTime() : endOfDay(range.from).getTime()
  return items.filter((item) => {
    const t = new Date(item.created_at).getTime()
    return t >= from && t <= to
  })
}
