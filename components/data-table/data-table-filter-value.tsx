'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ColumnConfig, ServerFilterRow } from '@/lib/types/data-table'

const TRIGGER_WIDE = 'w-full max-w-48'
const INPUT_MIN = 'min-w-28'

interface FilterValueCellProps {
  row: ServerFilterRow
  colConfig?: ColumnConfig
  onChange: (value: string, valueTo?: string) => void
}

export function FilterValueCell({
  row,
  colConfig,
  onChange,
}: FilterValueCellProps) {
  if (!colConfig || !row.operator) {
    return <Input className={INPUT_MIN} placeholder="Value..." disabled />
  }

  const { type } = colConfig

  if (type === 'select' && colConfig.options) {
    return (
      <FilterOptionSelect
        value={row.value}
        onChange={onChange}
        options={colConfig.options.map((opt) => ({ value: opt, label: opt }))}
      />
    )
  }

  if (type === 'boolean') {
    return (
      <FilterOptionSelect
        value={row.value}
        onChange={onChange}
        options={[
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]}
      />
    )
  }

  if (type === 'date') {
    if (row.operator === 'between') {
      return (
        <div className="flex items-center gap-1">
          <DatePickerInput
            value={row.value}
            onChange={(val) => onChange(val, row.valueTo)}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <DatePickerInput
            value={row.valueTo}
            onChange={(val) => onChange(row.value, val)}
          />
        </div>
      )
    }
    return (
      <DatePickerInput value={row.value} onChange={(val) => onChange(val)} />
    )
  }

  return (
    <Input
      type={type === 'number' ? 'number' : 'text'}
      className={INPUT_MIN}
      placeholder="Value..."
      value={row.value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.stopPropagation()}
    />
  )
}

interface FilterOptionSelectProps {
  value: string
  onChange: (value: string, valueTo?: string) => void
  options: { value: string; label: string }[]
}

function FilterOptionSelect({
  value,
  onChange,
  options,
}: FilterOptionSelectProps) {
  return (
    <Select
      value={value || undefined}
      onValueChange={(val) => onChange(val)}
    >
      <SelectTrigger className={TRIGGER_WIDE}>
        <SelectValue placeholder="Value..." />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

interface DatePickerInputProps {
  value: string
  onChange: (val: string) => void
}

function DatePickerInput({ value, onChange }: DatePickerInputProps) {
  const [open, setOpen] = useState(false)
  const date = value ? new Date(`${value}T00:00:00`) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`${INPUT_MIN} justify-start font-normal`}
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          {date ? (
            format(date, 'MMM d, yyyy')
          ) : (
            <span className="text-muted-foreground">Pick date...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onChange(d ? format(d, 'yyyy-MM-dd') : '')
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
