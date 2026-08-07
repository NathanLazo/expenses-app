import type { RouterOutputs } from "~/trpc/react";

/** Gasto tal como lo devuelve el router, con su categoría incluida. */
export type ExpenseWithCategory = NonNullable<
  RouterOutputs["useExpenses"]["getAll"]["result"]
>[number];

/** Ingreso tal como lo devuelve el router, con su IVA e ISR opcionales. */
export type Income = NonNullable<
  RouterOutputs["useIncomes"]["getAll"]["result"]
>[number];

/** Cliente con sus totales del periodo, tal como los devuelve el router. */
export type ClientWithTotals = NonNullable<
  RouterOutputs["useClients"]["getAll"]["result"]
>[number];

/** Un ciclo de la serie de tendencia. */
export type TrendPoint = NonNullable<
  RouterOutputs["useAnalytics"]["getTrend"]["result"]
>["cycles"][number];

/** Categoría con el conteo de gastos y los del mes en curso. */
export type CategoryWithStats = NonNullable<
  RouterOutputs["useCategories"]["getAll"]["result"]
>[number];

/**
 * Los procedimientos no lanzan errores: devuelven `status` y `result`.
 * Este helper evita que cada pantalla asuma que todo salió bien.
 */
export function isOkResult(response: { status: number }) {
  return response.status === 200;
}
