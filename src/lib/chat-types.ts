import type { InferUITools, UIDataTypes, UIMessage } from "ai";

import type { expenseTools } from "~/server/ai/tools";

/**
 * Tipos de las tools inferidos del servidor. El import es `import type`, así que
 * desaparece al compilar y el bundle del cliente nunca toca Prisma ni tRPC.
 */
export type ChatTools = InferUITools<typeof expenseTools>;

export type ChatUIMessage = UIMessage<never, UIDataTypes, ChatTools>;

export type ChatMessagePart = ChatUIMessage["parts"][number];

/** Gasto tal como lo devuelven las tools de crear y editar. */
export type ChatExpense = {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  image?: string | null;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
};
