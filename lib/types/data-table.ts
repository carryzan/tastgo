export type ColumnType = 'text' | 'number' | 'select' | 'date' | 'boolean'

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'ilike'
  | 'starts_with'
  | 'ends_with'
  | 'between'

export interface ColumnConfig {
  column: string
  label: string
  type: ColumnType
  options?: string[]
  sortable?: boolean
}

export interface ActiveFilter {
  id: string
  column: string
  operator: FilterOperator
  value: string
  valueTo?: string
}

/** Stored in TanStack `ColumnFilter.value` for each manual server filter row */
export interface ServerFilterRow {
  column: string
  operator: string
  value: string
  valueTo: string
}

export function parseServerFilterRow(value: unknown): ServerFilterRow {
  if (!value || typeof value !== 'object') {
    return { column: '', operator: '', value: '', valueTo: '' }
  }
  const v = value as Record<string, unknown>
  return {
    column: typeof v.column === 'string' ? v.column : '',
    operator: typeof v.operator === 'string' ? v.operator : '',
    value: typeof v.value === 'string' ? v.value : '',
    valueTo: typeof v.valueTo === 'string' ? v.valueTo : '',
  }
}

export function serverFilterRowComplete(row: ServerFilterRow): boolean {
  return row.column !== '' && row.operator !== '' && row.value !== ''
}

export function serverRowToActiveFilter(
  id: string,
  row: ServerFilterRow
): ActiveFilter {
  return {
    id,
    column: row.column,
    operator: row.operator as FilterOperator,
    value: row.value,
    valueTo: row.operator === 'between' ? row.valueTo : undefined,
  }
}

export function patchServerFilterRow(
  row: ServerFilterRow,
  patch: Partial<ServerFilterRow>,
  columnConfigs: ColumnConfig[]
): ServerFilterRow {
  if (patch.column !== undefined && patch.column !== row.column) {
    const newCol = columnConfigs.find((c) => c.column === patch.column)
    const operators = newCol ? OPERATORS_BY_TYPE[newCol.type] : []
    return {
      column: patch.column,
      operator: operators[0]?.value ?? '',
      value: '',
      valueTo: '',
    }
  }
  if (patch.operator !== undefined && patch.operator !== row.operator) {
    return { ...row, ...patch, value: '', valueTo: '' }
  }
  return { ...row, ...patch }
}

export interface Permission {
  canEdit?: boolean
  canDelete?: boolean
}

export const OPERATORS_BY_TYPE: Record<
  ColumnType,
  { value: FilterOperator; label: string }[]
> = {
  text: [
    { value: 'ilike', label: 'Contains' },
    { value: 'eq', label: 'Equals' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
  ],
  number: [
    { value: 'eq', label: 'Equals' },
    { value: 'gt', label: 'Greater than' },
    { value: 'lt', label: 'Less than' },
    { value: 'between', label: 'Between' },
  ],
  select: [
    { value: 'eq', label: 'Is' },
    { value: 'neq', label: 'Is not' },
  ],
  date: [
    { value: 'eq', label: 'Is' },
    { value: 'gt', label: 'Is after' },
    { value: 'lt', label: 'Is before' },
    { value: 'between', label: 'Is between' },
  ],
  boolean: [{ value: 'eq', label: 'Is' }],
}
