const UNIT_COST_DECIMALS = 6
const LINE_TOTAL_DECIMALS = 6

function parsePositiveNumber(value: string): number | null {
  if (!value.trim()) return null
  const n = Number(value)
  if (Number.isNaN(n) || n < 0) return null
  return n
}

function formatDecimal(n: number, maxDecimals: number): string {
  const rounded = Math.round(n * 10 ** maxDecimals) / 10 ** maxDecimals
  return String(rounded)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '')
}

export function lineTotalFromParts(qty: string, unitCost: string): string {
  const q = parsePositiveNumber(qty)
  const c = parsePositiveNumber(unitCost)
  if (q === null || c === null || q === 0) return ''
  return formatDecimal(q * c, LINE_TOTAL_DECIMALS)
}

export function unitCostFromLineTotal(total: string, qty: string): string | null {
  const t = parsePositiveNumber(total)
  const q = parsePositiveNumber(qty)
  if (t === null || q === null || q <= 0) return null
  return formatDecimal(t / q, UNIT_COST_DECIMALS)
}

export function isValidPurchaseQuantity(qty: string): boolean {
  const q = parsePositiveNumber(qty)
  return q !== null && q > 0
}
