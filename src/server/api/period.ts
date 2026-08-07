import { z } from "zod";

import type { db as database } from "~/server/db";
import { getCycleRange, normalizeCycleStartDay } from "~/lib/format";

/**
 * Las consultas se filtran por un rango explícito en vez de por mes calendario,
 * para que respeten el día de corte configurado en AppSettings.
 */
export const periodInput = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

export type PeriodInput = z.infer<typeof periodInput>;

/**
 * Si el cliente no manda rango, se usa el ciclo vigente según la configuración
 * guardada (y el mes calendario si todavía no hay configuración).
 */
export async function resolvePeriod(
  db: typeof database,
  input: PeriodInput,
): Promise<{ from: Date; to: Date }> {
  if (input.from && input.to) {
    return { from: input.from, to: input.to };
  }

  const cycle = getCycleRange(await getCycleStartDay(db));
  return { from: input.from ?? cycle.start, to: input.to ?? cycle.end };
}

/**
 * Único punto que lee el día de corte de la base.
 *
 * Está separado de `resolvePeriod` porque su contrato (`{from, to}`) tira justo
 * el dato que hace falta para generar una serie de varios ciclos. Quien necesite
 * N rangos lee el corte una vez con esto y los deriva en memoria, en vez de
 * llamar a `resolvePeriod` en bucle y pagar N lecturas de configuración.
 */
export async function getCycleStartDay(db: typeof database): Promise<number> {
  const settings = await db.appSettings.findUnique({
    where: { id: "global" },
    select: { cycleStartDay: true },
  });

  return normalizeCycleStartDay(settings?.cycleStartDay ?? 1);
}
