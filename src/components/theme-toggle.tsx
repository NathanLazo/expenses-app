"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Skeleton } from "~/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

const OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // El tema real sólo se conoce en el cliente; evita el desajuste de hidratación.
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Skeleton className="h-9 w-[240px]" />;
  }

  return (
    <ToggleGroup
      type="single"
      value={theme ?? "system"}
      onValueChange={(value) => value && setTheme(value)}
      variant="outline"
      className="w-fit"
    >
      {OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={`Tema ${option.label.toLowerCase()}`}
          className="px-3"
        >
          <option.icon className="mr-2 h-4 w-4" />
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
