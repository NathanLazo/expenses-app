"use client";

import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Skeleton } from "~/components/ui/skeleton";
import { useAppSettings } from "~/hooks/use-app-settings";
import type { Income } from "~/lib/api-types";
import { formatExpenseDate } from "~/lib/format";
import {
  formatIncomeTitle,
  getIncomeTotals,
  hasTaxes,
  sumIncomeTotals,
} from "~/lib/income";

/** Agrupa los ingresos por día conservando el orden descendente del servidor. */
function groupByDay(incomes: Income[]) {
  const groups = new Map<string, Income[]>();

  for (const income of incomes) {
    const key = new Date(income.date).toDateString();
    const bucket = groups.get(key);
    if (bucket) bucket.push(income);
    else groups.set(key, [income]);
  }

  return [...groups.entries()];
}

export function IncomeListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-baseline justify-between gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

type IncomeActions = {
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
};

function IncomeRow({
  income,
  onEdit,
  onDelete,
}: { income: Income } & IncomeActions) {
  const { formatAmount } = useAppSettings();
  const title = formatIncomeTitle(income);
  const totals = getIncomeTotals(income);

  // El desglose va en la columna de texto y no bajo el monto: en móvil una
  // segunda línea a la derecha estrujaba el título hasta hacerlo ilegible.
  // Sin impuestos el neto ya es la base, así que repetirla sobraría.
  const details = hasTaxes(income)
    ? [
        `Base ${formatAmount(totals.base)}`,
        income.iva !== null ? `IVA ${formatAmount(income.iva)}` : null,
        income.isr !== null ? `ISR ${formatAmount(income.isr)}` : null,
      ].filter(Boolean)
    : ["Sin impuestos"];

  return (
    <li className="hover:bg-accent/50 flex items-center gap-3 rounded-lg border p-3 transition-colors">
      {/* Sin burbuja de icono a la izquierda: aquí sería idéntica en todas las
          filas (los ingresos no tienen categoría) y le quitaba al concepto el
          ancho que necesita en móvil. El monto comparte renglón con el título
          para que el desglose disponga de la fila completa. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-medium">{title}</p>
          <span className="shrink-0 font-semibold tabular-nums">
            {formatAmount(totals.net)}
          </span>
        </div>
        <p className="text-muted-foreground truncate text-sm">
          {details.join(" · ")}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={`Acciones para ${title}`}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(income)}>
            <Pencil className="mr-2 size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(income)}
          >
            <Trash2 className="mr-2 size-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

export function IncomeList({
  incomes,
  onEdit,
  onDelete,
}: { incomes: Income[] } & IncomeActions) {
  const { formatAmount } = useAppSettings();
  const groups = groupByDay(incomes);

  return (
    <div className="space-y-6">
      {groups.map(([day, dayIncomes]) => (
        <section key={day} className="space-y-2">
          <header className="flex items-baseline justify-between gap-2 px-1">
            <h3 className="text-sm font-medium">
              {formatExpenseDate(new Date(day))}
            </h3>
            <span className="text-muted-foreground text-xs tabular-nums">
              {formatAmount(sumIncomeTotals(dayIncomes).net)}
            </span>
          </header>
          <ul className="space-y-2">
            {dayIncomes.map((income) => (
              <IncomeRow
                key={income.id}
                income={income}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
