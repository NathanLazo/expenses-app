import { isToolUIPart } from "ai";

import type { ChatUIMessage } from "~/lib/chat-types";

/**
 * Lo que el modelo lee en lugar del resultado de la tool. No es un "no" a la
 * idea: es que el usuario siguió escribiendo, así que suele venir una
 * corrección detrás.
 */
const DISMISSED_REASON =
  "El usuario escribió otro mensaje en vez de confirmar, así que la acción no se ejecutó. Toma en cuenta lo que acaba de decir y vuelve a proponerla si sigue teniendo sentido.";

/**
 * Cierra las confirmaciones que quedaron esperando un botón.
 *
 * Mientras la tarjeta espera respuesta, la llamada a la tool no tiene
 * resultado. Si el historial se manda así, el SDK lo rechaza entero
 * (`AI_MissingToolResultsError`) y el turno se cae antes de llegar al modelo:
 * es lo que pasaba al escribir un mensaje en vez de confirmar o descartar.
 *
 * Un mensaje nuevo manda sobre la propuesta anterior, así que la damos por
 * descartada: la llamada queda cerrada y el modelo se entera de que no corrió.
 */
export function dismissPendingApprovals(
  messages: ChatUIMessage[],
): ChatUIMessage[] {
  let dismissed = false;

  const next = messages.map((message) => {
    if (message.role !== "assistant") return message;
    if (
      !message.parts.some(
        (part) => isToolUIPart(part) && part.state === "approval-requested",
      )
    ) {
      return message;
    }

    dismissed = true;
    return {
      ...message,
      parts: message.parts.map((part) => {
        if (!isToolUIPart(part) || part.state !== "approval-requested") {
          return part;
        }

        return {
          ...part,
          state: "output-denied",
          approval: {
            ...part.approval,
            approved: false,
            reason: DISMISSED_REASON,
          },
        };
      }),
      // El `map` devuelve la unión de todas las tools y TypeScript ya no
      // reconoce cuál es cuál; el estado que armamos sí existe en el tipo.
    } as ChatUIMessage;
  });

  // Sin nada pendiente devolvemos el mismo arreglo: así el `setMessages` del
  // cliente no dispara un render de más en el caso normal.
  return dismissed ? next : messages;
}
