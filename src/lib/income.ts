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

/** Tasas de referencia para el llenado rápido del formulario. */
export const IVA_RATE = 0.16;
export const ISR_RETENTION_RATE = 0.1;

/** Redondea a centavos para que la suma de la pantalla cuadre con el dato. */
export function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
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

/** Título visible de un ingreso; el concepto es opcional. */
export function formatIncomeTitle(income: { description: string | null }) {
  const description = income.description?.trim();
  // No basta `??`: una descripción en blanco tampoco sirve como título.
  if (description) return description;
  return "Ingreso sin concepto";
}
