"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useAppSettings } from "~/hooks/use-app-settings";
import {
  formatPeriodLabel,
  getCycleAnchor,
  getCycleRangeForAnchor,
} from "~/lib/format";

type PeriodContextValue = {
  /** Mes/año en el que arranca el ciclo seleccionado. */
  month: number;
  year: number;
  /** Rango que se manda a la API: [from, to). */
  from: Date;
  to: Date;
  label: string;
  totalDays: number;
  daysLeft: number;
  daysElapsed: number;
  isCurrentPeriod: boolean;
  /** True cuando el periodo seleccionado ya pasó y puede avanzar. */
  canGoForward: boolean;
  setPeriod: (month: number, year: number) => void;
  goToPrevious: () => void;
  goToNext: () => void;
  goToCurrent: () => void;
};

const PeriodContext = createContext<PeriodContextValue | null>(null);

/**
 * Periodo compartido por el dashboard, gastos y reportes. No es un mes
 * calendario: es el ciclo que arranca en el día de corte configurado, así que
 * con corte el día 15 el periodo va del 15 al 14 del mes siguiente.
 *
 * El ancla se guarda como `null` mientras el usuario no navegue, para que al
 * cargar la configuración el periodo vigente se calcule con el corte real sin
 * sincronizar estado después del montaje.
 */
export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const { cycleStartDay } = useAppSettings();
  const [anchor, setAnchor] = useState<{ month: number; year: number } | null>(
    null,
  );

  const setPeriod = useCallback((month: number, year: number) => {
    setAnchor({ month, year });
  }, []);

  const value = useMemo<PeriodContextValue>(() => {
    const now = new Date();
    const currentAnchor = getCycleAnchor(cycleStartDay, now);
    const active = anchor ?? currentAnchor;

    const cycle = getCycleRangeForAnchor(
      cycleStartDay,
      active.month,
      active.year,
      now,
    );

    const isCurrentPeriod =
      active.month === currentAnchor.month &&
      active.year === currentAnchor.year;
    const isAtOrAfterCurrent =
      active.year > currentAnchor.year ||
      (active.year === currentAnchor.year &&
        active.month >= currentAnchor.month);

    const shift = (delta: number) => {
      const next = new Date(active.year, active.month + delta, 1);
      setAnchor({ month: next.getMonth(), year: next.getFullYear() });
    };

    return {
      month: active.month,
      year: active.year,
      from: cycle.start,
      to: cycle.end,
      label: formatPeriodLabel(cycleStartDay, cycle.start, cycle.end),
      totalDays: cycle.totalDays,
      daysLeft: cycle.daysLeft,
      daysElapsed: cycle.daysElapsed,
      isCurrentPeriod,
      canGoForward: !isAtOrAfterCurrent,
      setPeriod,
      goToPrevious: () => shift(-1),
      goToNext: () => shift(1),
      goToCurrent: () => setAnchor(null),
    };
  }, [anchor, cycleStartDay, setPeriod]);

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
