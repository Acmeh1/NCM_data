import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface PDRSearchableInputProps {
  items: any[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onManualEntry?: (value: string) => void;
}

export function PDRSearchableInput({ 
  items, 
  value, 
  onChange, 
  placeholder = "Rechercher...",
  onManualEntry
}: PDRSearchableInputProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  // normalize items to have label and value
  const pdrList = React.useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
      label: item.Intitule || item.nom || item.label || "Sans nom",
      value: item.Intitule || item.nom || item.value || ""
    })).filter(i => i.value !== "");
  }, [items]);

  const handleSelect = (currentValue: string) => {
    onChange(currentValue);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-left truncate"
        >
          <span className="truncate">
            {value
              ? pdrList.find((pdr) => pdr.value === value)?.label || value
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={placeholder} 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-6 text-center text-sm">
                <p>Aucun résultat trouvé pour "{searchValue}"</p>
                {onManualEntry && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 text-primary gap-2"
                    onClick={() => {
                      onManualEntry(searchValue);
                      setOpen(false);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Utiliser "{searchValue}"
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {pdrList.map((pdr) => (
                <CommandItem
                  key={pdr.value}
                  value={pdr.value}
                  onSelect={() => handleSelect(pdr.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === pdr.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {pdr.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
