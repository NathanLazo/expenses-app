import type { Category } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const useExpenses = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        amount: z.number(),
        description: z.string(),
        date: z.date(),
        categoryId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const expense = await ctx.db.expense.create({
          data: {
            amount: input.amount,
            description: input.description,
            date: input.date,
            categoryId: input.categoryId,
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
    .input(
      z.object({
        month: z.number().optional(),
        year: z.number().optional(),
        categoryId: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { month, year, categoryId } = input;
      const currentDate = new Date();
      const targetMonth = month ?? currentDate.getMonth();
      const targetYear = year ?? currentDate.getFullYear();

      try {
        const expenses = await ctx.db.expense.findMany({
          where: {
            categoryId,
            date: {
              gte: new Date(targetYear, targetMonth, 1),
              lt: new Date(targetYear, targetMonth + 1, 1),
            },
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
        description: z.string().min(1).optional(),
        categoryId: z.string().optional(),
        date: z.date().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, ...data } = input;
        const expense = await ctx.db.expense.update({
          where: { id },
          data,
          include: {
            category: true,
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

  getMonthlyStats: publicProcedure
    .input(
      z.object({
        month: z.number().optional(),
        year: z.number().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { month, year } = input;
      const currentDate = new Date();
      const targetMonth = month ?? currentDate.getMonth();
      const targetYear = year ?? currentDate.getFullYear();

      try {
        const expenses = await ctx.db.expense.findMany({
          where: {
            date: {
              gte: new Date(targetYear, targetMonth, 1),
              lt: new Date(targetYear, targetMonth + 1, 1),
            },
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
          message: "Monthly stats fetched successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          result: null,
          status: 500,
          error: error,
          message: "Monthly stats fetching failed",
        };
      }
    }),
});
