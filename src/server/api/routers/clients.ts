import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { periodInput, resolvePeriod } from "~/server/api/period";
import { sumIncomeTotals } from "~/lib/income";

export const useClients = createTRPCRouter({
  getAll: publicProcedure
    .input(periodInput.optional())
    .query(async ({ input, ctx }) => {
      const { from, to } = await resolvePeriod(ctx.db, input ?? {});

      try {
        const clients = await ctx.db.client.findMany({
          include: {
            // Sólo los importes del periodo, que es contra lo que se compara.
            // `select` estrecho: la lista no necesita el concepto ni la imagen.
            incomes: {
              where: { date: { gte: from, lt: to } },
              select: { amount: true, iva: true, isr: true },
            },
            _count: { select: { incomes: true } },
          },
          orderBy: { name: "asc" },
        });

        // El neto del periodo se resuelve aquí y no en cada pantalla, para que
        // nadie vuelva a reimplementar `base + IVA - ISR`.
        const result = clients.map(({ incomes, ...client }) => ({
          ...client,
          periodTotals: sumIncomeTotals(incomes),
          periodCount: incomes.length,
        }));

        return {
          result,
          status: 200,
          error: null,
          message: "Clients fetched successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Clients fetching failed",
        };
      }
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(60),
        color: z.string().default("#3B82F6"),
        icon: z.string().default("💼"),
        notes: z.string().trim().max(200).nullish(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const client = await ctx.db.client.create({
          data: { ...input, notes: input.notes?.trim() ?? null },
        });

        return {
          result: client,
          status: 200,
          error: null,
          message: "Client created successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Client creation failed",
        };
      }
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().trim().min(1).max(60).optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        notes: z.string().trim().max(200).nullish(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, notes, ...rest } = input;

        const data =
          notes === undefined
            ? rest
            : { ...rest, notes: notes?.trim() ?? null };

        const client = await ctx.db.client.update({ where: { id }, data });

        return {
          result: client,
          status: 200,
          error: null,
          message: "Client updated successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Client update failed",
        };
      }
    }),

  /**
   * A diferencia de borrar una categoría, esto NO arrastra los movimientos:
   * la relación es `SetNull`, así que los ingresos se conservan y quedan sin
   * cliente. Se devuelve cuántos quedaron sueltos para poder decirlo en la UI.
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const unlinked = await ctx.db.income.count({
          where: { clientId: input.id },
        });

        const client = await ctx.db.client.delete({ where: { id: input.id } });

        return {
          result: { ...client, unlinkedIncomes: unlinked },
          status: 200,
          error: null,
          message: "Client deleted successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Client deletion failed",
        };
      }
    }),
});
