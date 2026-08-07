import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { IncomeKind, PaymentMethod } from "@prisma/client";

import {
  getIncomeTotals,
  INCOME_KIND_LABELS,
  PAYMENT_METHOD_LABELS,
} from "~/lib/income";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * Las tools del chat no reimplementan nada: llaman a los mismos procedimientos
 * tRPC que usa la interfaz. Así el chat y los formularios comparten validación,
 * limpieza de tickets huérfanos e invalidación de caché.
 */
async function getCaller() {
  return createCaller(await createTRPCContext({ headers: new Headers() }));
}

const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato YYYY-MM-DD");

/**
 * Las fechas se anclan al mediodía local: los ciclos se calculan con fechas
 * locales, y a medianoche un desfase de zona horaria movería el gasto de día.
 */
function toLocalDate(value: string) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function toDateInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Rango opcional; sin él los procedimientos usan el ciclo vigente. */
const periodRange = {
  from: dateInput.optional().describe("Inicio del rango (inclusive)."),
  to: dateInput.optional().describe("Fin del rango (exclusive)."),
};

function resolveRange(input: { from?: string; to?: string }) {
  return {
    from: input.from ? toLocalDate(input.from) : undefined,
    to: input.to ? toLocalDate(input.to) : undefined,
  };
}

type CategoryOption = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

/**
 * El modelo puede alucinar un id: en vez de fallar con un error de base de
 * datos, devolvemos la lista válida para que reintente en el mismo turno.
 */
async function findCategory(categoryId: string) {
  const caller = await getCaller();
  const response = await caller.useCategories.getAll();
  const categories = response.result ?? [];
  const match = categories.find((category) => category.id === categoryId);

  if (match) {
    return {
      category: {
        id: match.id,
        name: match.name,
        icon: match.icon,
        color: match.color,
      } satisfies CategoryOption,
      available: null,
    };
  }

  return {
    category: null,
    available: categories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
    })),
  };
}

/** Forma con la que el chat muestra un ingreso, con el neto ya calculado. */
function toChatIncome(income: {
  id: string;
  amount: number;
  iva: number | null;
  isr: number | null;
  description: string | null;
  image: string | null;
  date: Date;
  kind: IncomeKind;
  project: string | null;
  paymentMethod: PaymentMethod | null;
  clientId: string | null;
  client?: { name: string } | null;
}) {
  return {
    id: income.id,
    amount: income.amount,
    iva: income.iva,
    isr: income.isr,
    net: getIncomeTotals(income).net,
    description: income.description,
    image: income.image,
    date: toDateInput(new Date(income.date)),
    kind: income.kind,
    // La etiqueta va resuelta para que el modelo no tenga que traducir el enum
    // ni se invente su propia versión en español.
    kindLabel: INCOME_KIND_LABELS[income.kind],
    project: income.project,
    paymentMethod: income.paymentMethod,
    paymentMethodLabel: income.paymentMethod
      ? PAYMENT_METHOD_LABELS[income.paymentMethod]
      : null,
    clientId: income.clientId,
    clientName: income.client?.name ?? null,
  };
}

export const chatTools = {
  listCategories: tool({
    description:
      "Lista las categorías con su presupuesto y lo gastado en el periodo. Úsala si necesitas ids frescos o el usuario pregunta por sus categorías.",
    inputSchema: z.object({}),
    execute: async () => {
      const caller = await getCaller();
      const response = await caller.useCategories.getAll();

      return {
        categories: (response.result ?? []).map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          budget: category.budget,
          spentThisPeriod: category.expenses.reduce(
            (sum, expense) => sum + expense.amount,
            0,
          ),
          expenseCount: category._count.expenses,
        })),
      };
    },
  }),

  getPeriodSummary: tool({
    description:
      "Totales del periodo: lo gastado con su desglose por categoría, lo cobrado con su IVA e ISR, y el balance entre ambos. Sin rango usa el ciclo vigente.",
    inputSchema: z.object(periodRange),
    execute: async (input) => {
      const caller = await getCaller();
      const range = resolveRange(input);
      const [response, incomeResponse] = await Promise.all([
        caller.useExpenses.getPeriodStats(range),
        caller.useIncomes.getPeriodStats(range),
      ]);

      if (!response.result) {
        return {
          ok: false as const,
          error: "No se pudo calcular el resumen del periodo.",
        };
      }

      const income = incomeResponse.result;

      return {
        ok: true as const,
        totalSpent: response.result.totalSpent,
        expenseCount: response.result.expenseCount,
        income: {
          net: income?.net ?? 0,
          base: income?.base ?? 0,
          iva: income?.iva ?? 0,
          isr: income?.isr ?? 0,
          count: income?.incomeCount ?? 0,
        },
        /** Neto cobrado menos gastado: el dinero que sobra del periodo. */
        balance: (income?.net ?? 0) - response.result.totalSpent,
        byCategory: response.result.categoryStats
          .map((stat) => ({
            categoryId: stat.category.id,
            name: stat.category.name,
            icon: stat.category.icon,
            color: stat.category.color,
            budget: stat.category.budget,
            total: stat.total,
            count: stat.count,
          }))
          .sort((a, b) => b.total - a.total),
      };
    },
  }),

  listExpenses: tool({
    description:
      "Busca gastos del periodo. Filtra por categoría y por texto en la descripción. Úsala antes de editar o borrar para obtener el id correcto.",
    inputSchema: z.object({
      ...periodRange,
      categoryId: z.string().optional(),
      search: z
        .string()
        .optional()
        .describe("Texto a buscar en la descripción o el nombre de categoría."),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    execute: async ({ categoryId, search, limit, ...range }) => {
      const caller = await getCaller();
      const response = await caller.useExpenses.getAll({
        ...resolveRange(range),
        categoryId,
      });

      const query = search?.trim().toLowerCase();
      const expenses = (response.result ?? []).filter((expense) => {
        if (!query) return true;
        // Con `??` un gasto que sí tiene descripción nunca llegaba a comparar
        // el nombre de la categoría: buscar "comida" no encontraba nada.
        const matchesDescription =
          expense.description?.toLowerCase().includes(query) === true;
        const matchesCategory = expense.category.name
          .toLowerCase()
          .includes(query);
        return matchesDescription || matchesCategory;
      });

      return {
        total: expenses.length,
        expenses: expenses.slice(0, limit).map((expense) => ({
          id: expense.id,
          amount: expense.amount,
          description: expense.description,
          date: toDateInput(new Date(expense.date)),
          image: expense.image,
          category: {
            id: expense.category.id,
            name: expense.category.name,
            icon: expense.category.icon,
            color: expense.category.color,
          },
        })),
      };
    },
  }),

  createExpense: tool({
    description:
      "Registra un gasto nuevo. Pasa `image` con la URL del ticket cuando el usuario haya adjuntado una foto, para que quede guardada en el gasto.",
    inputSchema: z.object({
      amount: z.number().positive().describe("Monto total del gasto."),
      iva: z
        .number()
        .nonnegative()
        .optional()
        .describe(
          "IVA acreditable YA INCLUIDO en `amount`, sólo si el gasto está facturado. De un total de 1160 son 160, no 185.60.",
        ),
      categoryId: z
        .string()
        .describe(
          "Id de una categoría existente, tal cual aparece en la lista.",
        ),
      date: dateInput.describe("Fecha del gasto. Usa hoy si no la sabes."),
      description: z
        .string()
        .max(120)
        .optional()
        .describe("Comercio o concepto, por ejemplo 'Súper del sábado'."),
      image: z
        .string()
        .url()
        .optional()
        .describe("URL de la foto del ticket que adjuntó el usuario."),
    }),
    execute: async ({ amount, iva, categoryId, date, description, image }) => {
      const { category, available } = await findCategory(categoryId);

      if (!category) {
        return {
          ok: false as const,
          error: "No existe esa categoría. Elige una de la lista.",
          availableCategories: available,
        };
      }

      const caller = await getCaller();
      const response = await caller.useExpenses.create({
        amount,
        iva: iva ?? null,
        description: description ?? null,
        date: toLocalDate(date),
        categoryId,
        image: image ?? null,
      });

      if (!response.result) {
        return { ok: false as const, error: "No se pudo registrar el gasto." };
      }

      return {
        ok: true as const,
        expense: {
          id: response.result.id,
          amount: response.result.amount,
          description: response.result.description,
          date: toDateInput(new Date(response.result.date)),
          image: response.result.image,
          category,
        },
      };
    },
  }),

  updateExpense: tool({
    description:
      "Modifica un gasto existente. Manda sólo los campos que cambian; obtén el id con listExpenses.",
    inputSchema: z.object({
      id: z.string(),
      amount: z.number().positive().optional(),
      categoryId: z.string().optional(),
      date: dateInput.optional(),
      description: z.string().max(120).nullable().optional(),
    }),
    execute: async ({ id, amount, categoryId, date, description }) => {
      if (categoryId) {
        const { category, available } = await findCategory(categoryId);
        if (!category) {
          return {
            ok: false as const,
            error: "No existe esa categoría. Elige una de la lista.",
            availableCategories: available,
          };
        }
      }

      const caller = await getCaller();
      const response = await caller.useExpenses.update({
        id,
        amount,
        categoryId,
        date: date ? toLocalDate(date) : undefined,
        description,
      });

      if (!response.result) {
        return { ok: false as const, error: "No se pudo actualizar el gasto." };
      }

      return {
        ok: true as const,
        expense: {
          id: response.result.id,
          amount: response.result.amount,
          description: response.result.description,
          date: toDateInput(new Date(response.result.date)),
          image: response.result.image,
          category: {
            id: response.result.category.id,
            name: response.result.category.name,
            icon: response.result.category.icon,
            color: response.result.category.color,
          },
        },
      };
    },
  }),

  deleteExpense: tool({
    description:
      "Elimina un gasto de forma permanente. Obtén el id con listExpenses y confirma con el usuario qué gasto es.",
    inputSchema: z.object({
      id: z.string(),
      /** Sólo para que la tarjeta de confirmación diga qué se va a borrar. */
      label: z
        .string()
        .describe("Descripción corta del gasto, para mostrarla al confirmar."),
    }),
    execute: async ({ id }) => {
      const caller = await getCaller();
      const response = await caller.useExpenses.delete({ id });

      if (!response.result) {
        return { ok: false as const, error: "No se pudo eliminar el gasto." };
      }

      return {
        ok: true as const,
        expense: {
          id: response.result.id,
          amount: response.result.amount,
          description: response.result.description,
          date: toDateInput(new Date(response.result.date)),
        },
      };
    },
  }),

  /* ------------------------------------------------------------- ingresos */

  listIncomes: tool({
    description:
      "Busca ingresos cobrados en el periodo. Filtra por texto en el concepto. Úsala antes de editar o borrar para obtener el id correcto.",
    inputSchema: z.object({
      ...periodRange,
      search: z.string().optional().describe("Texto a buscar en el concepto."),
      clientId: z.string().optional(),
      kind: z.nativeEnum(IncomeKind).optional(),
      limit: z.number().int().min(1).max(50).default(10),
    }),
    execute: async ({ search, limit, clientId, kind, ...range }) => {
      const caller = await getCaller();
      const response = await caller.useIncomes.getAll({
        ...resolveRange(range),
        clientId,
        kind,
      });

      const query = search?.trim().toLowerCase();
      const incomes = (response.result ?? []).filter((income) => {
        if (!query) return true;
        return income.description?.toLowerCase().includes(query) === true;
      });

      return {
        total: incomes.length,
        incomes: incomes.slice(0, limit).map(toChatIncome),
      };
    },
  }),

  createIncome: tool({
    description:
      "Registra un cobro. `amount` es la BASE antes de impuestos: en una factura es el subtotal, nunca el total. `iva` e `isr` van aparte y son opcionales. Pasa `image` con la URL de la factura cuando el usuario haya adjuntado una foto.",
    inputSchema: z.object({
      amount: z
        .number()
        .positive()
        .describe(
          "Lo cobrado antes de impuestos. En una factura es el subtotal, no el total ni el depósito.",
        ),
      iva: z
        .number()
        .nonnegative()
        .optional()
        .describe(
          "IVA trasladado, el que se suma a la base. Omítelo si el cobro no se facturó.",
        ),
      isr: z
        .number()
        .nonnegative()
        .optional()
        .describe(
          "ISR retenido por quien paga, el que se resta. Omítelo si no hubo retención.",
        ),
      date: dateInput.describe("Fecha del cobro. Usa hoy si no la sabes."),
      description: z
        .string()
        .max(120)
        .optional()
        .describe("Concepto o cliente, por ejemplo 'Factura 128, rediseño'."),
      image: z
        .string()
        .url()
        .optional()
        .describe("URL de la foto de la factura que adjuntó el usuario."),
      clientId: z
        .string()
        .optional()
        .describe("Id de un cliente existente, obtenido con listClients."),
      kind: z
        .nativeEnum(IncomeKind)
        .optional()
        .describe(
          "Tipo de ingreso. Si hay ISR retenido casi siempre es HONORARIOS.",
        ),
      project: z
        .string()
        .max(60)
        .optional()
        .describe(
          "Trabajo al que pertenece el cobro, si el usuario lo nombra.",
        ),
      paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    }),
    execute: async ({
      amount,
      iva,
      isr,
      date,
      description,
      image,
      clientId,
      kind,
      project,
      paymentMethod,
    }) => {
      const caller = await getCaller();
      const response = await caller.useIncomes.create({
        amount,
        iva: iva ?? null,
        isr: isr ?? null,
        description: description ?? null,
        image: image ?? null,
        date: toLocalDate(date),
        clientId: clientId ?? null,
        kind,
        project: project ?? null,
        paymentMethod: paymentMethod ?? null,
      });

      if (!response.result) {
        return { ok: false as const, error: response.message };
      }

      return { ok: true as const, income: toChatIncome(response.result) };
    },
  }),

  updateIncome: tool({
    description:
      "Modifica un ingreso existente. Manda sólo los campos que cambian; obtén el id con listIncomes. Manda null en `iva` o `isr` para borrar ese impuesto.",
    inputSchema: z.object({
      id: z.string(),
      amount: z.number().positive().optional(),
      iva: z.number().nonnegative().nullable().optional(),
      isr: z.number().nonnegative().nullable().optional(),
      date: dateInput.optional(),
      description: z.string().max(120).nullable().optional(),
      clientId: z.string().nullable().optional(),
      kind: z.nativeEnum(IncomeKind).optional(),
      project: z.string().max(60).nullable().optional(),
      paymentMethod: z.nativeEnum(PaymentMethod).nullable().optional(),
    }),
    execute: async ({
      id,
      amount,
      iva,
      isr,
      date,
      description,
      clientId,
      kind,
      project,
      paymentMethod,
    }) => {
      const caller = await getCaller();
      const response = await caller.useIncomes.update({
        id,
        amount,
        iva,
        isr,
        date: date ? toLocalDate(date) : undefined,
        description,
        clientId,
        kind,
        project,
        paymentMethod,
      });

      if (!response.result) {
        return { ok: false as const, error: response.message };
      }

      return { ok: true as const, income: toChatIncome(response.result) };
    },
  }),

  deleteIncome: tool({
    description:
      "Elimina un ingreso de forma permanente. Obtén el id con listIncomes y confirma con el usuario cuál es.",
    inputSchema: z.object({
      id: z.string(),
      /** Sólo para que la tarjeta de confirmación diga qué se va a borrar. */
      label: z
        .string()
        .describe("Concepto corto del ingreso, para mostrarlo al confirmar."),
    }),
    execute: async ({ id }) => {
      const caller = await getCaller();
      const response = await caller.useIncomes.delete({ id });

      if (!response.result) {
        return { ok: false as const, error: "No se pudo eliminar el ingreso." };
      }

      return { ok: true as const, income: toChatIncome(response.result) };
    },
  }),

  /* ------------------------------------------------------------- clientes */

  listClients: tool({
    description:
      "Lista los clientes con lo que te dejaron en el periodo. Úsala para obtener el id antes de registrar un ingreso a nombre de alguien.",
    inputSchema: z.object({}),
    execute: async () => {
      const caller = await getCaller();
      const response = await caller.useClients.getAll();

      return {
        clients: (response.result ?? []).map((client) => ({
          id: client.id,
          name: client.name,
          icon: client.icon,
          color: client.color,
          netThisPeriod: client.periodTotals.net,
          countThisPeriod: client.periodCount,
        })),
      };
    },
  }),

  createClient: tool({
    description:
      "Crea un cliente. Úsala sólo cuando ninguno de los existentes sea el mismo; revisa antes con listClients para no duplicar.",
    inputSchema: z.object({
      name: z.string().min(1).max(60),
      icon: z.string().default("💼").describe("Un solo emoji."),
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .default("#3B82F6"),
    }),
    execute: async (input) => {
      const caller = await getCaller();
      const response = await caller.useClients.create(input);

      if (!response.result) {
        return { ok: false as const, error: "No se pudo crear el cliente." };
      }

      return {
        ok: true as const,
        client: {
          id: response.result.id,
          name: response.result.name,
          icon: response.result.icon,
          color: response.result.color,
        },
      };
    },
  }),

  /* ------------------------------------------------------------- análisis */

  getTrend: tool({
    description:
      "Compara varios periodos entre sí: ingreso, gasto y balance de los últimos N ciclos. Úsala para cualquier pregunta de evolución, tendencia o comparación contra meses anteriores.",
    inputSchema: z.object({
      count: z
        .number()
        .int()
        .min(1)
        .max(24)
        .default(6)
        .describe("Cuántos ciclos traer, contando hacia atrás."),
    }),
    execute: async ({ count }) => {
      const caller = await getCaller();
      const response = await caller.useAnalytics.getTrend({ count });

      if (!response.result) {
        return { ok: false as const, error: response.message };
      }

      return {
        ok: true as const,
        cycles: response.result.cycles.map((cycle) => ({
          label: cycle.label,
          from: toDateInput(cycle.from),
          to: toDateInput(cycle.to),
          spent: cycle.expenses.total,
          expenseCount: cycle.expenses.count,
          incomeNet: cycle.income.net,
          incomeBase: cycle.income.base,
          iva: cycle.income.iva,
          isr: cycle.income.isr,
          incomeCount: cycle.income.count,
          balance: cycle.balance,
          // Sin esto el modelo compararía medio ciclo contra ciclos completos
          // y anunciaría una caída que no existe.
          isPartial: cycle.isPartial,
        })),
      };
    },
  }),

  getIncomeByClient: tool({
    description:
      "Reparto del ingreso del periodo por cliente, con su peso en el total. Úsala para 'qué cliente me deja más' o preguntas de concentración.",
    inputSchema: z.object(periodRange),
    execute: async (input) => {
      const caller = await getCaller();
      const response = await caller.useAnalytics.getIncomeByClient(
        resolveRange(input),
      );

      if (!response.result) {
        return { ok: false as const, error: response.message };
      }

      return {
        ok: true as const,
        totalNet: response.result.totals.net,
        clients: response.result.clients.map((client) => ({
          name: client.name,
          count: client.count,
          net: client.net,
          iva: client.iva,
          isr: client.isr,
          sharePercent: Math.round(client.share * 10) / 10,
        })),
      };
    },
  }),

  getTaxReserve: tool({
    description:
      "Cuánto del saldo NO es del usuario porque se le debe al SAT. Es una estimación de reserva, nunca un cálculo fiscal: respeta al pie de la letra las salvedades que devuelve.",
    inputSchema: z.object(periodRange),
    execute: async (input) => {
      const caller = await getCaller();
      const response = await caller.useAnalytics.getTaxReserve(
        resolveRange(input),
      );

      if (!response.result) {
        return { ok: false as const, error: response.message };
      }

      const reserve = response.result;
      return {
        ok: true as const,
        reservaSugerida: reserve.reservaSugerida,
        ivaTrasladadoCobrado: reserve.ivaTrasladadoCobrado,
        ivaAcreditableCapturado: reserve.ivaAcreditableCapturado,
        isrRetenido: reserve.isrRetenido,
        coverage: reserve.coverage,
        isFiscalCalculation: reserve.isFiscalCalculation,
        disclaimers: reserve.disclaimers,
      };
    },
  }),

  createCategory: tool({
    description:
      "Crea una categoría nueva. Úsala sólo cuando ninguna de las existentes encaje con el gasto.",
    inputSchema: z.object({
      name: z.string().min(1).max(40),
      icon: z.string().describe("Un solo emoji, por ejemplo 🍔."),
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .describe("Color en hexadecimal, por ejemplo #3B82F6."),
      budget: z
        .number()
        .positive()
        .optional()
        .describe("Presupuesto mensual, si el usuario lo menciona."),
    }),
    execute: async (input) => {
      const caller = await getCaller();
      const response = await caller.useCategories.create(input);

      if (!response.result) {
        return { ok: false as const, error: "No se pudo crear la categoría." };
      }

      return {
        ok: true as const,
        category: {
          id: response.result.id,
          name: response.result.name,
          icon: response.result.icon,
          color: response.result.color,
          budget: response.result.budget,
        },
      };
    },
  }),
};

/** Escrituras: siempre pasan por la confirmación del usuario en el chat. */
export const CHAT_TOOL_APPROVAL = {
  createExpense: "user-approval",
  updateExpense: "user-approval",
  deleteExpense: "user-approval",
  createIncome: "user-approval",
  updateIncome: "user-approval",
  deleteIncome: "user-approval",
  createCategory: "user-approval",
  createClient: "user-approval",
} as const;
