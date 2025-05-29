import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const userCategories = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      const categories = await ctx.db.category.findMany({
        include: {
          expenses: {
            where: {
              date: {
                gte: new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  1,
                ),
              },
            },
          },
          _count: {
            select: { expenses: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!categories) {
        return {
          error: categories,
          result: null,
          status: 200,
          message: "Categories not found",
        };
      }

      return {
        error: null,
        result: categories,
        status: 200,
        message: "Categories fetched successfully",
      };
    } catch (error) {
      console.error(error);
      return {
        error: error,
        result: null,
        status: 500,
        message: "Failed to fetch categories",
      };
    }
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        color: z.string().default("#3B82F6"),
        icon: z.string().default("💰"),
        budget: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const category = await ctx.db.category.create({
          data: {
            ...input,
          },
        });

        if (!category) {
          return {
            error: category,
            result: null,
            status: 200,
            message: "Category created successfully",
          };
        }

        return {
          error: null,
          result: category,
          status: 200,
          message: "Category created successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          error: error,
          result: null,
          status: 500,
          message: "Failed to create category",
        };
      }
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        budget: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      try {
        const category = await ctx.db.category.update({
          where: { id },
          data,
        });

        if (!category) {
          return {
            error: category,
            result: null,
            status: 200,
            message: "Category updated successfully",
          };
        }

        return {
          error: null,
          result: category,
          status: 200,
          message: "Category updated successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          error: error,
          result: null,
          status: 500,
          message: "Failed to update category",
        };
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const category = await ctx.db.category.delete({
          where: { id: input.id },
        });

        if (!category) {
          return {
            error: category,
            result: null,
            status: 200,
            message: "Category deleted successfully",
          };
        }

        return {
          error: null,
          result: category,
          status: 200,
          message: "Category deleted successfully",
        };
      } catch (error) {
        console.error(error);
        return {
          error: error,
          result: null,
          status: 500,
          message: "Failed to delete category",
        };
      }
    }),
});
