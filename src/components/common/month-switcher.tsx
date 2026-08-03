"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { usePeriod } from "~/components/providers/period-provider";
import { MONTH_NAMES } from "~/lib/format";
import { cn } from "~/lib/utils";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 4 + i);

/** Navegador de mes/año compartido por dashboard, gastos y reportes. */
export function MonthSwitcher({ className }: { className?: string }) {
  const {
    month,
    year,
    isCurrentPeriod,
    canGoForward,
    setPeriod,
    goToPrevious,
    goToNext,
    goToCurrent,
  } = usePeriod();

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={goToPrevious}
        aria-label="Mes anterior"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <Select
        value={String(month)}
        onValueChange={(value) => setPeriod(Number(value), year)}
      >
        <SelectTrigger className="w-[130px]" aria-label="Mes">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, index) => (
            <SelectItem key={name} value={String(index)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(year)}
        onValueChange={(value) => setPeriod(month, Number(value))}
      >
        <SelectTrigger className="w-[92px]" aria-label="Año">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {YEARS.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={goToNext}
        disabled={!canGoForward}
        aria-label="Mes siguiente"
      >
        <ChevronRight className="size-4" />
      </Button>

      {!isCurrentPeriod ? (
        <Button variant="ghost" size="sm" onClick={goToCurrent}>
          Hoy
        </Button>
      ) : null}
    </div>
  );
}
