import type { Category } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { periodInput, resolvePeriod } from "~/server/api/period";
import { deleteReceipt } from "~/server/blob";

export const useExpenses = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        amount: z.number(),
        description: z.string().nullish(),
        date: z.date(),
        categoryId: z.string(),
        image: z.string().url().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const expense = await ctx.db.expense.create({
          data: {
            amount: input.amount,
            description: input.description?.trim() ?? null,
            date: input.date,
            categoryId: input.categoryId,
            image: input.image ?? null,
          },
        });

        if (!expense) {
          return {
            result: null,
            status: 404,
            error: "Expense not found",
            message: "Expense not found",
          };
        }
        return {
          result: expense,
          status: 200,
          error: null,
          message: "Expense created successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Expense creation failed",
        };
      }
    }),
  getAll: publicProcedure
    .input(periodInput.extend({ categoryId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const { categoryId } = input;
      const { from, to } = await resolvePeriod(ctx.db, input);

      try {
        const expenses = await ctx.db.expense.findMany({
          where: {
            categoryId,
            date: { gte: from, lt: to },
          },
          include: {
            category: true,
          },
          orderBy: { date: "desc" },
        });

        if (!expenses) {
          return {
            result: null,
            status: 404,
            error: "Expenses not found",
            message: "Expenses not found",
          };
        }
        return {
          result: expenses,
          status: 200,
          error: null,
          message: "Expenses fetched successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Expenses fetching failed",
        };
      }
    }),
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        amount: z.number().positive().optional(),
        description: z.string().nullish(),
        categoryId: z.string().optional(),
        date: z.date().optional(),
        image: z.string().url().nullable().optional(),
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

        // Si el ticket cambia hay que soltar el anterior, si no queda huérfano
        // en el store para siempre.
        const previous =
          data.image === undefined
            ? null
            : await ctx.db.expense.findUnique({
                where: { id },
                select: { image: true },
              });

        const expense = await ctx.db.expense.update({
          where: { id },
          data,
          include: {
            category: true,
          },
        });

        if (previous?.image && previous.image !== expense.image) {
          await deleteReceipt(previous.image);
        }

        if (!expense) {
          return {
            result: null,
            status: 404,
            error: "Expense not found",
            message: "Expense not found",
          };
        }
        return {
          result: expense,
          status: 200,
          error: null,
          message: "Expense updated successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Expense update failed",
        };
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const expense = await ctx.db.expense.delete({
          where: { id: input.id },
        });

        await deleteReceipt(expense.image);

        if (!expense) {
          return {
            result: null,
            status: 404,
            error: "Expense not found",
            message: "Expense not found",
          };
        }
        return {
          result: expense,
          status: 200,
          error: null,
          message: "Expense deleted successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Expense deletion failed",
        };
      }
    }),

  /**
   * Borra una imagen que se subió pero nunca llegó a guardarse (el usuario la
   * quitó, la reemplazó o cerró el formulario). Sin esto, cada foto descartada
   * quedaría ocupando espacio en Blob para siempre.
   *
   * Vive en este router por historia, pero sirve a los dos formularios que
   * suben imágenes: tickets de gasto y facturas de ingreso.
   */
  discardReceipt: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Red de seguridad: si algún gasto o ingreso todavía apunta a esa URL,
        // no se toca. Omitir los ingresos aquí borraría la factura de uno ya
        // guardado en cuanto el usuario descartara otra imagen.
        const [expenseInUse, incomeInUse] = await Promise.all([
          ctx.db.expense.findFirst({
            where: { image: input.url },
            select: { id: true },
          }),
          ctx.db.income.findFirst({
            where: { image: input.url },
            select: { id: true },
          }),
        ]);

        if (expenseInUse ?? incomeInUse) {
          return {
            result: { deleted: false },
            status: 200,
            error: null,
            message: "Receipt still in use",
          };
        }

        await deleteReceipt(input.url);

        return {
          result: { deleted: true },
          status: 200,
          error: null,
          message: "Receipt discarded successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Receipt discard failed",
        };
      }
    }),

  getPeriodStats: publicProcedure
    .input(periodInput)
    .query(async ({ input, ctx }) => {
      const { from, to } = await resolvePeriod(ctx.db, input);

      try {
        const expenses = await ctx.db.expense.findMany({
          where: {
            date: { gte: from, lt: to },
          },
          include: {
            category: true,
          },
        });

        if (!expenses) {
          return {
            result: null,
            status: 404,
            error: "Expenses not found",
            message: "Expenses not found",
          };
        }
        const totalSpent = expenses.reduce(
          (sum, expense) => sum + expense.amount,
          0,
        );

        const categoryStats = expenses.reduce(
          (acc, expense) => {
            const categoryId = expense.categoryId;
            acc[categoryId] ??= {
              category: expense.category,
              total: 0,
              count: 0,
            };
            acc[categoryId].total += expense.amount;
            acc[categoryId].count += 1;
            return acc;
          },
          {} as Record<
            string,
            { category: Category; total: number; count: number }
          >,
        );

        return {
          result: {
            totalSpent,
            expenseCount: expenses.length,
            categoryStats: Object.values(categoryStats),
          },
          status: 200,
          error: null,
          message: "Period stats fetched successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Period stats fetching failed",
        };
      }
    }),
});
