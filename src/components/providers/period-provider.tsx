"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { formatMonthLabel } from "~/lib/format";

type PeriodContextValue = {
  month: number;
  year: number;
  label: string;
  isCurrentPeriod: boolean;
  /** True cuando el periodo seleccionado ya pasó y no puede avanzar más. */
  canGoForward: boolean;
  setPeriod: (month: number, year: number) => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToCurrent: () => void;
};

const PeriodContext = createContext<PeriodContextValue | null>(null);

/**
 * Periodo (mes/año) compartido por el dashboard, gastos y reportes. Al vivir
 * en el shell, cambiar de mes en una pantalla se conserva al navegar a otra.
 */
export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const [period, setPeriodState] = useState({
    month: now.getMonth(),
    year: now.getFullYear(),
  });

  const setPeriod = useCallback((month: number, year: number) => {
    setPeriodState({ month, year });
  }, []);

  const value = useMemo<PeriodContextValue>(() => {
    const today = new Date();
    const isCurrentPeriod =
      period.month === today.getMonth() && period.year === today.getFullYear();
    // No tiene sentido navegar a meses que todavía no ocurren.
    const isAtOrAfterCurrent =
      period.year > today.getFullYear() ||
      (period.year === today.getFullYear() && period.month >= today.getMonth());

    const shift = (delta: number) => {
      const next = new Date(period.year, period.month + delta, 1);
      setPeriodState({ month: next.getMonth(), year: next.getFullYear() });
    };

    return {
      ...period,
      label: formatMonthLabel(period.month, period.year),
      isCurrentPeriod,
      canGoForward: !isAtOrAfterCurrent,
      setPeriod,
      goToPrevious: () => shift(-1),
      goToNext: () => shift(1),
      goToCurrent: () =>
        setPeriodState({
          month: today.getMonth(),
          year: today.getFullYear(),
        }),
    };
  }, [period, setPeriod]);

  return (
    <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
  );
}

export function usePeriod() {
  const context = useContext(PeriodContext);
  if (!context) {
    throw new Error("usePeriod debe usarse dentro de <PeriodProvider />");
  }
  return context;
}
