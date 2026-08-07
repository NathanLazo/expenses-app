import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { periodInput, resolvePeriod } from "~/server/api/period";
import { sumIncomeTotals } from "~/lib/income";

/**
 * IVA e ISR se aceptan como `nullish`: `undefined` deja el valor como estaba y
 * `null` lo limpia. Sin esa distinción no habría forma de quitar un impuesto
 * capturado por error.
 */
const taxInput = z.number().nonnegative().nullish();

export const useIncomes = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        iva: taxInput,
        isr: taxInput,
        description: z.string().nullish(),
        date: z.date(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const income = await ctx.db.income.create({
          data: {
            amount: input.amount,
            iva: input.iva ?? null,
            isr: input.isr ?? null,
            description: input.description?.trim() ?? null,
            date: input.date,
          },
        });

        return {
          result: income,
          status: 200,
          error: null,
          message: "Income created successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Income creation failed",
        };
      }
    }),

  getAll: publicProcedure.input(periodInput).query(async ({ input, ctx }) => {
    const { from, to } = await resolvePeriod(ctx.db, input);

    try {
      const incomes = await ctx.db.income.findMany({
        where: {
          date: { gte: from, lt: to },
        },
        orderBy: { date: "desc" },
      });

      return {
        result: incomes,
        status: 200,
        error: null,
        message: "Incomes fetched successfully",
      };
    } catch (error) {
      console.error(error);
      return {
        result: null,
        status: 500,
        error: error,
        message: "Incomes fetching failed",
      };
    }
  }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().positive().optional(),
        iva: taxInput,
        isr: taxInput,
        description: z.string().nullish(),
        date: z.date().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, description, ...rest } = input;

        // Sin descripción el campo se limpia; si no viene en el input, se deja
        // como estaba.
        const data =
          description === undefined
            ? rest
            : { ...rest, description: description?.trim() ?? null };

        const income = await ctx.db.income.update({
          where: { id },
          data,
        });

        return {
          result: income,
          status: 200,
          error: null,
          message: "Income updated successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Income update failed",
        };
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const income = await ctx.db.income.delete({
          where: { id: input.id },
        });

        return {
          result: income,
          status: 200,
          error: null,
          message: "Income deleted successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Income deletion failed",
        };
      }
    }),

  /**
   * Totales del periodo ya desglosados, que es lo que se necesita a la hora de
   * declarar: cuánto se cobró, cuánto de eso es IVA trasladado, cuánto ISR
   * retuvieron y cuánto quedó neto.
   */
  getPeriodStats: publicProcedure
    .input(periodInput)
    .query(async ({ input, ctx }) => {
      const { from, to } = await resolvePeriod(ctx.db, input);

      try {
        const incomes = await ctx.db.income.findMany({
          where: {
            date: { gte: from, lt: to },
          },
          select: { amount: true, iva: true, isr: true },
        });

        return {
          result: {
            ...sumIncomeTotals(incomes),
            incomeCount: incomes.length,
          },
          status: 200,
          error: null,
          message: "Income stats fetched successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Income stats fetching failed",
        };
      }
    }),
});
