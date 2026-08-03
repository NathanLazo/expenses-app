import { z } from "zod";

import type { db as database } from "~/server/db";
import { getCycleRange } from "~/lib/format";

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

  const settings = await db.appSettings.findUnique({
    where: { id: "global" },
    select: { cycleStartDay: true },
  });

  const cycle = getCycleRange(settings?.cycleStartDay ?? 1);
  return { from: input.from ?? cycle.start, to: input.to ?? cycle.end };
}
