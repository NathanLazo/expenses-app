"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";

import { CategoryIcon } from "~/components/common/category-icon";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

export type ClientOption = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

type ClientComboboxProps = {
  value: string | null;
  onChange: (clientId: string | null) => void;
  clients: ClientOption[];
  /** Crea el cliente y devuelve su id para seleccionarlo en el acto. */
  onCreate: (name: string) => Promise<string | null>;
  disabled?: boolean;
  /**
   * `FormControl` es un Slot: inyecta `id`, `aria-describedby` y `aria-invalid`
   * en su hijo directo. Si no se reciben y se reenvían al botón, el `<label>`
   * del campo apunta a un id que no existe y el lector de pantalla anuncia sólo
   * el valor ("Sin cliente") sin decir de qué campo se trata.
   */
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/**
 * Selector de cliente que además puede crear uno escribiendo su nombre. Sin el
 * alta en línea habría que abandonar el formulario a medio capturar un cobro
 * sólo porque el cliente es nuevo, que es justo cuando más prisa se tiene.
 */
export function ClientCombobox({
  value,
  onChange,
  clients,
  onCreate,
  disabled,
  ...field
}: ClientComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selected = clients.find((client) => client.id === value) ?? null;
  const trimmed = query.trim();
  const alreadyExists = clients.some(
    (client) => client.name.toLowerCase() === trimmed.toLowerCase(),
  );

  const handleCreate = async () => {
    if (!trimmed || isCreating) return;
    setIsCreating(true);
    try {
      const id = await onCreate(trimmed);
      if (id) {
        onChange(id);
        setIsOpen(false);
        setQuery("");
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          {...field}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <CategoryIcon
                icon={selected.icon}
                color={selected.color}
                size="sm"
              />
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Sin cliente</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      {/* `w-[--var]` no es sintaxis válida: hay que envolverla en `var()` o el
          popover se queda del ancho de su contenido en vez del disparador. */}
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder="Buscar o escribir uno nuevo..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {/* El alta vive sólo como CommandItem, más abajo. Un botón suelto
                aquí sería inalcanzable con el teclado (cmdk sólo navega items)
                y además nunca llegaría a mostrarse: en cuanto hay texto, el
                item de crear coincide y suprime este estado vacío. */}
            <CommandEmpty>
              <p className="text-muted-foreground py-3 text-center text-sm">
                Todavía no tienes clientes.
              </p>
            </CommandEmpty>

            <CommandGroup>
              <CommandItem
                value="__sin_cliente__"
                onSelect={() => {
                  onChange(null);
                  setIsOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 size-4",
                    value === null ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="text-muted-foreground">Sin cliente</span>
              </CommandItem>

              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => {
                    onChange(client.id);
                    setIsOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === client.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex min-w-0 items-center gap-2">
                    <CategoryIcon
                      icon={client.icon}
                      color={client.color}
                      size="sm"
                    />
                    <span className="truncate">{client.name}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            {/* Con coincidencias parciales, CommandEmpty no se muestra, así que
                el alta necesita su propia entrada. */}
            {trimmed && !alreadyExists ? (
              <CommandGroup>
                <CommandItem
                  value={`__crear__${trimmed}`}
                  onSelect={() => void handleCreate()}
                >
                  <Plus className="mr-2 size-4" />
                  {isCreating ? "Creando..." : `Crear "${trimmed}"`}
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
