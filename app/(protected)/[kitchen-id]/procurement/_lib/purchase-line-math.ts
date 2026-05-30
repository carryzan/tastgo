const UNIT_COST_DECIMALS = 12
const LINE_TOTAL_DECIMALS = 6
const DECIMAL_INPUT_PATTERN = /^\d*(?:\.\d*)?$/
const DECIMAL_VALUE_PATTERN = /^(?:\d+\.?\d*|\.\d+)$/

export function normalizePurchaseDecimalInput(value: string): string | null {
  const normalized = value.trim().replaceAll(',', '.')
  if (!DECIMAL_INPUT_PATTERN.test(normalized)) return null
  return normalized
}

export function parsePurchaseDecimal(value: string): number | null {
  const normalized = normalizePurchaseDecimalInput(value)
  if (normalized === null || !DECIMAL_VALUE_PATTERN.test(normalized)) return null
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function formatPurchaseAmount(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

function formatDecimal(n: number, maxDecimals: number): string {
  const factor = 10 ** maxDecimals
  const rounded = Math.round((n + Number.EPSILON) * factor) / factor
  return rounded
    .toFixed(maxDecimals)
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '')
}

export function lineTotalFromParts(qty: string, unitCost: string): string {
  const q = parsePurchaseDecimal(qty)
  const c = parsePurchaseDecimal(unitCost)
  if (q === null || c === null || q === 0) return ''
  return formatDecimal(q * c, LINE_TOTAL_DECIMALS)
}

export function unitCostFromLineTotal(total: string, qty: string): string | null {
  const t = parsePurchaseDecimal(total)
  const q = parsePurchaseDecimal(qty)
  if (t === null || q === null || q <= 0) return null
  return formatDecimal(t / q, UNIT_COST_DECIMALS)
}

export function isValidPurchaseQuantity(qty: string): boolean {
  const q = parsePurchaseDecimal(qty)
  return q !== null && q > 0
}
