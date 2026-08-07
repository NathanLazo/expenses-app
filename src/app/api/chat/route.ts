import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

import { dismissPendingApprovals } from "~/lib/chat-approvals";
import type { ChatUIMessage } from "~/lib/chat-types";
import {
  DEFAULT_CURRENCY,
  formatPeriodLabel,
  getCycleRange,
} from "~/lib/format";
import { CHAT_TOOL_APPROVAL, chatTools } from "~/server/ai/tools";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/** Leer un ticket y encadenar varias tools tarda más que una respuesta normal. */
export const maxDuration = 60;

/**
 * Se resuelve por el AI Gateway de Vercel (`provider/modelo`), así que no hace
 * falta instalar el paquete del proveedor ni manejar su API key: en Vercel basta
 * con el OIDC del proyecto y en local con `AI_GATEWAY_API_KEY`.
 */
const MODEL = "anthropic/claude-sonnet-5";

function toDateInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Los tickets se suben a Blob antes de mandarse, así que el modelo ve la imagen
 * pero no su URL. La listamos aparte para que pueda adjuntarla al gasto.
 */
function collectReceiptUrls(messages: UIMessage[]) {
  const urls: string[] = [];

  for (const message of messages) {
    if (message.role !== "user") continue;
    for (const part of message.parts) {
      if (
        part.type === "file" &&
        part.mediaType?.startsWith("image/") &&
        part.url.startsWith("http")
      ) {
        urls.push(part.url);
      }
    }
  }

  return urls;
}

/**
 * El contexto (fecha, ciclo, moneda y categorías) va en las instrucciones para
 * que el caso común —foto de ticket a gasto registrado— no gaste un turno extra
 * consultando tools.
 */
async function buildInstructions(messages: UIMessage[]) {
  const caller = createCaller(
    await createTRPCContext({ headers: new Headers() }),
  );

  const [settingsResponse, categoriesResponse] = await Promise.all([
    caller.useSettings.get(),
    caller.useCategories.getAll(),
  ]);

  const settings = settingsResponse.result;
  const currency = settings?.currency ?? DEFAULT_CURRENCY;
  const cycleStartDay = settings?.cycleStartDay ?? 1;
  const cycle = getCycleRange(cycleStartDay);

  const categories = categoriesResponse.result ?? [];
  const categoryLines = categories.length
    ? categories
        .map(
          (category) =>
            `- ${category.icon} ${category.name} — id: ${category.id}${
              category.budget ? ` — presupuesto ${category.budget}` : ""
            }`,
        )
        .join("\n")
    : "- (todavía no hay ninguna categoría)";

  const receiptUrls = collectReceiptUrls(messages);
  const receiptLines = receiptUrls.length
    ? receiptUrls.map((url, index) => `${index + 1}. ${url}`).join("\n")
    : "(ninguna)";

  return `Eres el asistente de Zen Expenses, una app personal de finanzas. Hablas español de México, de tú, en frases cortas y sin rodeos.

Tu trabajo es que registrar un movimiento cueste lo mínimo posible. El caso estrella: el usuario manda una foto y tú deduces todo.

## Antes que nada: ¿gasto o ingreso?
- GASTO es lo que el usuario pagó: ticket de compra, recibo de un comercio, una factura donde él es el receptor.
- INGRESO es lo que le pagaron: una factura que él emitió, un recibo de honorarios, un cobro que recibió.
- En una factura, mira de qué lado están los datos del usuario. Si es el emisor, es ingreso. Si es el receptor, es gasto.
- Si de verdad no puedes distinguirlo, pregunta en una línea antes de registrar nada.

## Cómo leer un ticket de gasto
- El monto es el TOTAL pagado (incluye impuestos y propina), no el subtotal ni una línea suelta.
- La descripción es el nombre del comercio, tal cual aparece en el ticket. Si además es evidente qué se compró, añádelo corto: "Oxxo · café y pan".
- La fecha viene impresa en el ticket; si no se ve, usa hoy.
- Elige la categoría existente que mejor encaje. No inventes ids.
- Si el ticket está borroso o el total es ambiguo, di qué no pudiste leer y pregunta sólo por eso.

## Cómo leer una factura de ingreso
Un ingreso se guarda en tres piezas, no en una. Es al revés que en un gasto: aquí el total NO es el monto.
- \`amount\` es la BASE: el subtotal antes de impuestos. Nunca el total de la factura ni lo que se depositó.
- \`iva\` es el IVA trasladado, el que se suma a la base. Suele ser el 16% de la base. Omítelo si el cobro no se facturó.
- \`isr\` es el ISR retenido, el que resta quien paga. En honorarios suele ser el 10% de la base. Omítelo si la factura no trae retenciones.
- La app calcula sola lo que le queda al usuario: base más IVA menos ISR. No lo registres tú ya restado.
- Si la factura trae retención de IVA además de la de ISR, díselo al usuario: hoy no hay campo para esa retención y tendría que ajustarla a mano.
- El concepto es el del CFDI, corto, con el folio si se ve: "Factura 128, rediseño de marca".
- Los ingresos no llevan categoría, pero sí guardan la imagen: si el usuario adjuntó la factura, pasa su URL en \`image\`.

## De dónde viene el dinero
- El cliente es quien paga. Búscalo con listClients y pasa su \`clientId\`. Si en la factura viene un receptor que no está en la lista, propón crearlo con createClient; no inventes ids.
- El tipo (\`kind\`) casi siempre es HONORARIOS cuando hay ISR retenido. VENTA para productos, RENTA para inmuebles, SALARIO para nómina, INTERESES para rendimientos.
- El proyecto agrupa varios cobros de un mismo trabajo. Ponlo sólo si el usuario lo nombra o se lee en la factura; no lo inventes a partir del concepto.

## Impuestos en los gastos
- Un gasto guarda el TOTAL pagado en \`amount\`. El campo \`iva\` es el que ya venía DENTRO de ese total, no algo que se sume.
- Si el ticket desglosa IVA, pásalo. De un total de 1160 el IVA es 160, no 185.60.
- Si el ticket no lo desglosa, omítelo. No lo estimes: hay gastos sin IVA, a tasa 0 y exentos, y meter un número inventado desvía el apartado del SAT.

## Cómo actuar
- Cuando tengas los datos, llama directo a la tool. NO preguntes "¿lo registro?": crear, editar y borrar ya le piden confirmación al usuario con un botón, así que preguntar antes duplica el trabajo.
- Después de que una tool corra bien, contesta con una línea. La tarjeta ya muestra los montos y la fecha: no los repitas.
- Para editar o borrar, primero busca el movimiento con listExpenses o listIncomes y usa el id real.
- Consulta con las tools antes de afirmar números. Nunca inventes montos ni totales.
- Para comparar periodos usa getTrend, no sumes a mano. Un ciclo con \`isPartial\` todavía no cierra: no lo compares contra ciclos completos sin decirlo, o anunciarás una caída que no existe.

## El apartado del SAT: lo que NO puedes decir
getTaxReserve devuelve una estimación de reserva. Devuelve \`isFiscalCalculation: false\` justamente para que no la vistas de otra cosa.
- Di "aparta al menos esto". NUNCA digas "debes esto", "esto es lo que hay que declarar" ni "tus impuestos del mes son".
- Repite siempre al menos que no incluye ISR por pagar, así que la obligación real es mayor.
- No estimes el ISR por pagar. Depende del régimen, de las deducciones y de la tarifa acumulada del ejercicio, y nada de eso vive en esta app.
- Si el usuario insiste en un número para declarar, dile con claridad que la app no lo puede calcular y que eso lo ve con su contador.
- Los montos van como número puro (1234.5), sin símbolos ni separadores de miles.
- Si no existe ninguna categoría que encaje para un gasto, propón crear una y usa createCategory.

## Contexto de hoy
- Fecha de hoy: ${toDateInput(new Date())}.
- Moneda configurada: ${currency}. Los montos que leas en el ticket ya están en esa moneda salvo que diga otra cosa.
- Ciclo de presupuesto vigente: ${formatPeriodLabel(cycleStartDay, cycle.start, cycle.end)} (del ${toDateInput(cycle.start)} al ${toDateInput(new Date(cycle.end.getTime() - 86400000))}), quedan ${cycle.daysLeft} días.

## Categorías disponibles
${categoryLines}

## Imágenes adjuntas en esta conversación
Llegaron en este orden. Al registrar un movimiento a partir de una foto, pasa siempre su URL en el campo \`image\`: en un gasto queda guardada como ticket y en un ingreso como factura.
${receiptLines}`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as { messages: ChatUIMessage[] };
  /**
   * El cliente ya cierra las confirmaciones que quedaron a medias, pero una
   * llamada a una tool sin resultado tumba el turno entero
   * (`AI_MissingToolResultsError`). Lo repetimos aquí para que ningún historial
   * viejo —el de un "Reintentar", por ejemplo— pueda tirar el endpoint.
   */
  const messages = dismissPendingApprovals(body.messages);

  const result = streamText({
    model: MODEL,
    instructions: await buildInstructions(messages),
    messages: await convertToModelMessages(messages),
    tools: chatTools,
    toolApproval: CHAT_TOOL_APPROVAL,
    stopWhen: isStepCount(8),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        console.error("[api/chat]", error);
        return error instanceof Error
          ? error.message
          : "Algo salió mal al generar la respuesta.";
      },
    }),
  });
}
