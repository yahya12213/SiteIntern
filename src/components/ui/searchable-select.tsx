import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils/cellUtils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  emptyMessage?: string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionnez...",
  disabled = false,
  className,
  emptyMessage = "Aucun résultat trouvé.",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    const query = searchQuery.toLowerCase().trim()
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue)
    setOpen(false)
    setSearchQuery("")
  }

  // Reset search when closing
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("")
    }
  }, [open])

  // Handle keyboard typing to filter
  React.useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore special keys
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key === 'Enter' && filteredOptions.length === 1) {
        handleSelect(filteredOptions[0].value)
        return
      }
      if (e.key === 'Backspace') {
        setSearchQuery(prev => prev.slice(0, -1))
        return
      }
      // Only handle printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        setSearchQuery(prev => prev + e.key)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, filteredOptions])

  const listboxId = React.useId()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open ? "true" : "false"}
          aria-controls={listboxId}
          aria-label={placeholder}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        id={listboxId}
        className="w-[--radix-popover-trigger-width] p-0 bg-white border shadow-lg"
        align="start"
        ref={containerRef}
      >
        {/* Afficher le texte recherché si l'utilisateur tape */}
        {searchQuery && (
          <div className="px-3 py-2 border-b bg-gray-50 text-sm text-gray-600">
            Recherche: <span className="font-medium text-gray-900">{searchQuery}</span>
          </div>
        )}
        <div className="max-h-[250px] overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500">
              {emptyMessage}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "relative flex cursor-pointer select-none items-center px-3 py-2 text-sm hover:bg-blue-50",
                  value === option.value && "bg-blue-50 text-blue-700"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 text-blue-600",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
