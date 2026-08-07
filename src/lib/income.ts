import type { IncomeKind, PaymentMethod } from "@prisma/client";

/**
 * Un ingreso se guarda en tres piezas independientes para que cuadre con lo que
 * dice una factura: la base (lo cobrado antes de impuestos), el IVA que se
 * traslada encima y el ISR que retiene quien paga. IVA e ISR son opcionales
 * porque no todo lo que se cobra se factura.
 *
 *   base + IVA            = total facturado
 *   base + IVA - ISR      = lo que llega a la cuenta
 */
export type IncomeAmounts = {
  amount: number;
  iva: number | null;
  isr: number | null;
};

/**
 * Nombres en pantalla de los enums. El import es `import type`, así que estas
 * tablas viven en el bundle del cliente sin arrastrar `@prisma/client`: los
 * enums de Prisma son objetos en tiempo de ejecución y usarlos como valor
 * metería el cliente de la base en el navegador.
 */
export const INCOME_KIND_LABELS: Record<IncomeKind, string> = {
  HONORARIOS: "Honorarios",
  SALARIO: "Salario",
  VENTA: "Venta",
  RENTA: "Renta",
  INTERESES: "Intereses",
  OTRO: "Otro",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  TRANSFERENCIA: "Transferencia",
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  PLATAFORMA: "Plataforma",
  OTRO: "Otro",
};

export const INCOME_KINDS = Object.keys(INCOME_KIND_LABELS) as IncomeKind[];
export const PAYMENT_METHODS = Object.keys(
  PAYMENT_METHOD_LABELS,
) as PaymentMethod[];

/** Tasas de referencia para el llenado rápido del formulario. */
export const IVA_RATE = 0.16;
export const ISR_RETENTION_RATE = 0.1;

/** Redondea a centavos para que la suma de la pantalla cuadre con el dato. */
export function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * IVA contenido en un total que ya lo incluye. Es el caso del gasto, donde se
 * captura lo pagado en la caja: si el total es 116, el IVA es 16, no 18.56.
 * En el ingreso pasa al revés, porque ahí la base va sin impuestos.
 */
export function ivaIncludedIn(total: number) {
  return roundToCents((total * IVA_RATE) / (1 + IVA_RATE));
}

export type IncomeTotals = {
  base: number;
  iva: number;
  isr: number;
  invoiced: number;
  net: number;
};

export function getIncomeTotals(income: IncomeAmounts): IncomeTotals {
  const iva = income.iva ?? 0;
  const isr = income.isr ?? 0;
  const invoiced = income.amount + iva;

  return {
    base: income.amount,
    iva,
    isr,
    invoiced,
    net: invoiced - isr,
  };
}

export function sumIncomeTotals(incomes: IncomeAmounts[]): IncomeTotals {
  return incomes.reduce<IncomeTotals>(
    (acc, income) => {
      const totals = getIncomeTotals(income);
      return {
        base: acc.base + totals.base,
        iva: acc.iva + totals.iva,
        isr: acc.isr + totals.isr,
        invoiced: acc.invoiced + totals.invoiced,
        net: acc.net + totals.net,
      };
    },
    { base: 0, iva: 0, isr: 0, invoiced: 0, net: 0 },
  );
}

/** True cuando el ingreso trae al menos un impuesto capturado, aunque sea 0. */
export function hasTaxes(income: IncomeAmounts) {
  return income.iva !== null || income.isr !== null;
}

/**
 * Título visible de un ingreso. El concepto manda; si no hay, el nombre del
 * cliente identifica el cobro igual que el nombre de la categoría identifica a
 * un gasto sin descripción.
 */
export function formatIncomeTitle(income: {
  description: string | null;
  client?: { name: string } | null;
}) {
  const description = income.description?.trim();
  // No basta `??`: una descripción en blanco tampoco sirve como título.
  if (description) return description;
  if (income.client?.name.trim()) return income.client.name;
  return "Ingreso sin concepto";
}
