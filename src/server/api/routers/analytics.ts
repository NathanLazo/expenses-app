import { IncomeKind } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  getCycleStartDay,
  periodInput,
  resolvePeriod,
} from "~/server/api/period";
import { bucketByCycle, buildCycleSeries } from "~/lib/cycles";
import { getCycleAnchor } from "~/lib/format";
import { roundToCents, sumIncomeTotals } from "~/lib/income";

const SIN_CLIENTE = "__sin_cliente__";

/** Redondea a centavos una vez por bucket, nunca por fila: redondear cada
 *  movimiento introduce un sesgo que se acumula en la misma dirección. */
function roundTotals<T extends Record<string, number>>(totals: T): T {
  const out = {} as Record<string, number>;
  for (const [key, value] of Object.entries(totals)) {
    out[key] = roundToCents(value);
  }
  return out as T;
}

export const useAnalytics = createTRPCRouter({
  /**
   * Serie de los últimos N ciclos. El corte se lee una sola vez y los rangos se
   * derivan en memoria; los movimientos se traen con dos consultas que cubren
   * todo el span y se reparten después.
   */
  getTrend: publicProcedure
    .input(
      z.object({
        // El tope no es decorativo: sin él, un `count` grande genera un span de
        // décadas y una consulta sin techo.
        count: z.number().int().min(1).max(24).default(6),
        anchorMonth: z.number().int().min(0).max(11).optional(),
        anchorYear: z.number().int().min(2000).max(2100).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        const cycleStartDay = await getCycleStartDay(ctx.db);
        const current = getCycleAnchor(cycleStartDay);

        const cycles = buildCycleSeries(cycleStartDay, {
          count: input.count,
          anchorMonth: input.anchorMonth ?? current.month,
          anchorYear: input.anchorYear ?? current.year,
        });

        const first = cycles[0];
        const last = cycles[cycles.length - 1];

        if (!first || !last) {
          return {
            result: null,
            status: 500,
            error: "Empty cycle series",
            message: "No se pudo construir la serie de periodos",
          };
        }

        const span = { gte: first.from, lt: last.to };

        // `select` estrecho a propósito: la tendencia no desglosa por categoría,
        // así que traer la relación multiplicaría el payload sin usarlo.
        const [expenses, incomes] = await Promise.all([
          ctx.db.expense.findMany({
            where: { date: span },
            select: { date: true, amount: true },
          }),
          ctx.db.income.findMany({
            where: { date: span },
            select: { date: true, amount: true, iva: true, isr: true },
          }),
        ]);

        const expenseBuckets = bucketByCycle(
          expenses,
          cycles,
          cycleStartDay,
          (row) => row.date,
        );
        const incomeBuckets = bucketByCycle(
          incomes,
          cycles,
          cycleStartDay,
          (row) => row.date,
        );

        const dropped = expenseBuckets.dropped + incomeBuckets.dropped;
        if (dropped > 0) {
          console.error(
            `[analytics.getTrend] ${dropped} movimientos no cayeron en ningún ciclo`,
          );
        }

        const points = cycles.map((cycle, index) => {
          const cycleExpenses = expenseBuckets.buckets[index] ?? [];
          const cycleIncomes = incomeBuckets.buckets[index] ?? [];

          const spent = roundToCents(
            cycleExpenses.reduce((sum, row) => sum + row.amount, 0),
          );
          const income = roundTotals(sumIncomeTotals(cycleIncomes));

          return {
            ...cycle,
            expenses: { total: spent, count: cycleExpenses.length },
            income: { ...income, count: cycleIncomes.length },
            balance: roundToCents(income.net - spent),
          };
        });

        return {
          result: { cycleStartDay, cycles: points },
          status: 200,
          error: null,
          message: "Trend fetched successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Trend fetching failed",
        };
      }
    }),

  /** Reparto del ingreso del periodo por cliente, ya ordenado y con su peso. */
  getIncomeByClient: publicProcedure
    .input(
      periodInput.extend({
        kind: z.nativeEnum(IncomeKind).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { from, to } = await resolvePeriod(ctx.db, input);

      try {
        const incomes = await ctx.db.income.findMany({
          where: { date: { gte: from, lt: to }, kind: input.kind },
          select: {
            amount: true,
            iva: true,
            isr: true,
            clientId: true,
            client: {
              select: { id: true, name: true, color: true, icon: true },
            },
          },
        });

        const groups = new Map<
          string,
          {
            clientId: string | null;
            name: string;
            color: string | null;
            icon: string | null;
            rows: { amount: number; iva: number | null; isr: number | null }[];
          }
        >();

        for (const income of incomes) {
          const key = income.clientId ?? SIN_CLIENTE;
          const group = groups.get(key) ?? {
            clientId: income.clientId,
            name: income.client?.name ?? "Sin cliente",
            color: income.client?.color ?? null,
            icon: income.client?.icon ?? null,
            rows: [],
          };
          group.rows.push(income);
          groups.set(key, group);
        }

        const totals = roundTotals(sumIncomeTotals(incomes));

        const clients = [...groups.values()]
          .map((group) => {
            const groupTotals = roundTotals(sumIncomeTotals(group.rows));
            return {
              clientId: group.clientId,
              name: group.name,
              color: group.color,
              icon: group.icon,
              count: group.rows.length,
              ...groupTotals,
              // El peso se calcula aquí para que ninguna pantalla lo vuelva a
              // dividir mal.
              share: totals.net ? (groupTotals.net / totals.net) * 100 : 0,
            };
          })
          .sort((a, b) => b.net - a.net);

        return {
          result: {
            from,
            to,
            clients,
            totals: { ...totals, count: incomes.length },
          },
          status: 200,
          error: null,
          message: "Income by client fetched successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Income by client fetching failed",
        };
      }
    }),

  /**
   * Cuánto del saldo no es tuyo. NO es un cálculo fiscal y el resultado está
   * construido para que no se pueda confundir con uno: la reserva es una cota
   * superior del IVA, no incluye ISR por pagar, y viene con las salvedades
   * dentro del propio payload para que la pantalla no pueda omitirlas.
   */
  getTaxReserve: publicProcedure
    .input(periodInput)
    .query(async ({ input, ctx }) => {
      const { from, to } = await resolvePeriod(ctx.db, input);

      try {
        const cycleStartDay = await getCycleStartDay(ctx.db);
        const span = { gte: from, lt: to };

        const [incomes, expenses] = await Promise.all([
          ctx.db.income.findMany({
            where: { date: span },
            select: { amount: true, iva: true, isr: true },
          }),
          ctx.db.expense.findMany({
            where: { date: span },
            select: { iva: true },
          }),
        ]);

        const income = roundTotals(sumIncomeTotals(incomes));

        const expensesWithIva = expenses.filter((row) => row.iva !== null);
        const ivaAcreditableCapturado = roundToCents(
          expensesWithIva.reduce((sum, row) => sum + (row.iva ?? 0), 0),
        );

        // Sólo se resta el IVA efectivamente capturado. Como lo capturado nunca
        // puede ser más que lo real, la reserva sigue siendo una cota superior:
        // conforme se capture más IVA de gastos, sólo puede bajar.
        const reserve = Math.max(
          0,
          roundToCents(income.iva - ivaAcreditableCapturado),
        );

        const uninvoicedCount = incomes.filter(
          (row) => row.iva === null && row.isr === null,
        ).length;

        const disclaimers = [
          "Estimación interna para apartar dinero. No es un cálculo fiscal ni sustituye a tu contador.",
          "Es una cota superior del IVA: sólo descuenta el IVA de gastos que hayas capturado, así que conforme captures más, esta cifra baja.",
          "No incluye ISR por pagar. Tu obligación real es mayor que esta cifra.",
          "El ISR retenido ya te lo descontaron: es un pago provisional a cuenta, no forma parte de esta reserva.",
        ];

        if (cycleStartDay !== 1) {
          disclaimers.push(
            "Tu ciclo no empieza el día 1, así que no coincide con ningún periodo de declaración del SAT, que son meses de calendario.",
          );
        }

        if (uninvoicedCount > 0) {
          disclaimers.push(
            `${uninvoicedCount} ${uninvoicedCount === 1 ? "cobro no tiene" : "cobros no tienen"} IVA ni ISR capturados y no suman a esta reserva.`,
          );
        }

        return {
          result: {
            from,
            to,
            income,
            ivaTrasladadoCobrado: income.iva,
            isrRetenido: income.isr,
            ivaAcreditableCapturado,
            reservaSugerida: reserve,
            coverage: {
              expensesInRange: expenses.length,
              expensesConIvaCapturado: expensesWithIva.length,
              cobrosSinImpuestos: uninvoicedCount,
            },
            /** Bandera explícita para que la UI y el chat no tengan que
             *  inferir el tono correcto a partir del nombre de los campos. */
            isFiscalCalculation: false as const,
            disclaimers,
          },
          status: 200,
          error: null,
          message: "Tax reserve fetched successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Tax reserve fetching failed",
        };
      }
    }),
});
