import { SearchIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface DataTableSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DataTableSearch({
  value,
  onChange,
  placeholder = 'Search…',
}: DataTableSearchProps) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  )
}
