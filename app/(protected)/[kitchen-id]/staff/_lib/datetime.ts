export function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return ''

  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)
  return localDate.toISOString().slice(0, 16)
}

export function fromDateTimeLocalValue(value: string) {
  return new Date(value).toISOString()
}

export function toTimeValue(value: string | null | undefined) {
  if (!value) return ''

  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)
  return localDate.toISOString().slice(11, 16)
}

export function combineDateAndTimeToIso(
  dateValue: string,
  timeValue: string,
  dayOffset = 0
) {
  const date = new Date(`${dateValue}T${timeValue}`)
  date.setDate(date.getDate() + dayOffset)
  return date.toISOString()
}
