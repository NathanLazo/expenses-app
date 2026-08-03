"use client";

import type { ChartConfig } from "~/components/ui/chart";

function MoneyTooltipRow({
  color,
  label,
  amount,
}: {
  color?: string;
  label: string;
  amount: string;
}) {
  return (
    <span className="flex w-full items-center gap-2">
      <span
        aria-hidden
        className="size-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium tabular-nums">{amount}</span>
    </span>
  );
}

/**
 * Formatter para `<ChartTooltipContent>`: los tooltips de shadcn muestran el
 * número crudo, y en una app de gastos deben verse con la moneda configurada.
 * Conserva el punto de color y la etiqueta de la serie.
 */
export function moneyTooltipFormatter(
  config: ChartConfig,
  formatAmount: (amount: number) => string,
) {
  return function formatMoneyTooltip(
    value: unknown,
    name: unknown,
    item?: { color?: string },
  ) {
    const key = typeof name === "string" ? name : "";
    const entry = config[key];
    const label = typeof entry?.label === "string" ? entry.label : key;

    return (
      <MoneyTooltipRow
        color={item?.color ?? entry?.color}
        label={label}
        amount={formatAmount(Number(value))}
      />
    );
  };
}
