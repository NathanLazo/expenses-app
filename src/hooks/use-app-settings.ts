"use client";

import { useCallback } from "react";

import {
  DEFAULT_CURRENCY,
  formatCompactCurrency,
  formatCurrency,
  getCycleRange,
} from "~/lib/format";
import { api } from "~/trpc/react";

/**
 * Acceso central a la configuración global (moneda, presupuesto y ciclo).
 * Devuelve formateadores ya ligados a la moneda elegida para que ninguna
 * pantalla vuelva a asumir "$" con dos decimales.
 */
export function useAppSettings() {
  const { data, isLoading } = api.useSettings.get.useQuery();

  const settings = data?.result ?? null;
  const currency = settings?.currency ?? DEFAULT_CURRENCY;
  const cycleStartDay = settings?.cycleStartDay ?? 1;

  const formatAmount = useCallback(
    (amount: number) => formatCurrency(amount, currency),
    [currency],
  );

  const formatCompactAmount = useCallback(
    (amount: number) => formatCompactCurrency(amount, currency),
    [currency],
  );

  return {
    settings,
    isLoading,
    currency,
    cycleStartDay,
    monthlyBudget: settings?.monthlyBudget ?? null,
    cycle: getCycleRange(cycleStartDay),
    formatAmount,
    formatCompactAmount,
  };
}
