import type { Category } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const useSettings = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        cycleStartDay: z.number().min(1).max(28),
        monthlyBudget: z.number().positive(),
        currency: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const settings = await ctx.db.appSettings.create({
          data: input,
        });

        if (!settings) {
          return {
            result: null,
            status: 404,
            error: "Settings not found",
            message: "Settings not found",
          };
        }
        return {
          result: settings,
          status: 200,
          error: null,
          message: "Settings created successfully",
        };
      } catch (error) {
        return {
          result: null,
          status: 500,
          error: error,
          message: "Settings creation failed",
        };
      }
    }),

  get: publicProcedure.query(async ({ ctx }) => {
    try {
      const settings = await ctx.db.appSettings.findUnique({
        where: { id: "global" },
      });

      if (!settings) {
        return {
          result: null,
          status: 404,
          error: "Settings not found",
          message: "Settings not found",
        };
      }

      return {
        result: settings,
        status: 200,
        error: null,
        message: "Settings fetched successfully",
      };
    } catch (error) {
      return {
        result: null,
        status: 500,
        error: error,
        message: "Settings fetching failed",
      };
    }
  }),

  update: publicProcedure
    .input(
      z.object({
        cycleStartDay: z.number().min(1).max(28).optional(),
        monthlyBudget: z.number().positive().optional(),
        currency: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const settings = await ctx.db.appSettings.upsert({
          where: { id: "global" },
          update: input,
          create: {
            id: "global",
            ...input,
          },
        });

        if (!settings) {
          return {
            result: null,
            status: 404,
            error: "Settings not found",
            message: "Settings not found",
          };
        }

        return {
          result: settings,
          status: 200,
          error: null,
          message: "Settings updated successfully",
        };
      } catch (error) {
        return {
          result: null,
          status: 500,
          error: error,
          message: "Settings update failed",
        };
      }
    }),
});
