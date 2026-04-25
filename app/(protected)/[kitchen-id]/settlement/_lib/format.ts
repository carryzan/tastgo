export function formatMoney(value: string | number | null) {
  if (value == null) return '-'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '-'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

export function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function memberName(
  member: { profiles: { full_name: string | null } | null } | null
) {
  return member?.profiles?.full_name ?? '-'
}
