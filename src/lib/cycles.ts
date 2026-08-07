import {
  formatPeriodLabel,
  getCycleAnchor,
  getCycleRangeForAnchor,
  normalizeCycleStartDay,
} from "~/lib/format";

/**
 * Un ciclo de la serie de tendencia. `key` es un entero monótono
 * (`año * 12 + mes`) que sirve a la vez de identidad y de orden, y permite
 * repartir miles de movimientos en sus ciclos con un solo lookup por fila.
 */
export type CycleWindow = {
  key: number;
  month: number;
  year: number;
  from: Date;
  to: Date;
  label: string;
  totalDays: number;
  daysElapsed: number;
  isCurrent: boolean;
  /**
   * El ciclo todavía no cierra. Sin esta marca, la última barra de una gráfica
   * de tendencia parece un desplome cuando en realidad es medio ciclo.
   */
  isPartial: boolean;
};

/**
 * Ciclo al que pertenece una fecha, como entero.
 *
 * Es la misma regla de `getCycleAnchor` (si aún no se alcanza el día de corte,
 * el ciclo arrancó el mes anterior) pero sin construir un `Date` intermedio por
 * llamada, que sobre miles de filas sí se nota. Que ambas usen la misma regla
 * es lo que impide que el reparto y la generación de rangos se desincronicen.
 */
export function cycleKeyOf(date: Date, cycleStartDay: number) {
  const day = normalizeCycleStartDay(cycleStartDay);
  return (
    date.getFullYear() * 12 + date.getMonth() + (date.getDate() < day ? -1 : 0)
  );
}

/** Los `count` ciclos que terminan en el ancla dada, del más viejo al más nuevo. */
export function buildCycleSeries(
  cycleStartDay: number,
  options: {
    count: number;
    anchorMonth: number;
    anchorYear: number;
    reference?: Date;
  },
): CycleWindow[] {
  const reference = options.reference ?? new Date();
  const current = getCycleAnchor(cycleStartDay, reference);
  const cycles: CycleWindow[] = [];

  for (let back = options.count - 1; back >= 0; back--) {
    // `new Date(año, mes - n, 1)` normaliza solo el desbordamiento de mes y de
    // año, así que no hace falta aritmética propia para cruzar enero.
    const anchor = new Date(options.anchorYear, options.anchorMonth - back, 1);
    const month = anchor.getMonth();
    const year = anchor.getFullYear();
    const range = getCycleRangeForAnchor(cycleStartDay, month, year, reference);

    cycles.push({
      key: year * 12 + month,
      month,
      year,
      from: range.start,
      to: range.end,
      label: formatPeriodLabel(cycleStartDay, range.start, range.end),
      totalDays: range.totalDays,
      daysElapsed: range.daysElapsed,
      isCurrent: month === current.month && year === current.year,
      isPartial: range.start <= reference && reference < range.end,
    });
  }

  return cycles;
}

/**
 * Reparte filas en sus ciclos en O(filas + ciclos): un mapa de clave a índice y
 * un lookup por fila, en vez de recorrer los ciclos por cada movimiento.
 *
 * `dropped` cuenta las filas que no cayeron en ningún ciclo. Con un `where`
 * bien puesto debería ser siempre cero; devolverlo convierte en visible un
 * desajuste que si no restaría en silencio de los totales.
 */
export function bucketByCycle<T>(
  rows: readonly T[],
  cycles: readonly CycleWindow[],
  cycleStartDay: number,
  getDate: (row: T) => Date,
): { buckets: T[][]; dropped: number } {
  const indexByKey = new Map<number, number>();
  cycles.forEach((cycle, index) => indexByKey.set(cycle.key, index));

  const buckets: T[][] = cycles.map(() => []);
  let dropped = 0;

  for (const row of rows) {
    const index = indexByKey.get(cycleKeyOf(getDate(row), cycleStartDay));
    if (index === undefined) {
      dropped += 1;
      continue;
    }
    buckets[index]?.push(row);
  }

  return { buckets, dropped };
}
