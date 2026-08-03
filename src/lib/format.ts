import { format, isSameDay, isSameYear } from "date-fns";
import { es } from "date-fns/locale";

export const CURRENCIES = [
  { value: "USD", label: "USD · Dólar estadounidense", locale: "en-US" },
  { value: "EUR", label: "EUR · Euro", locale: "es-ES" },
  { value: "MXN", label: "MXN · Peso mexicano", locale: "es-MX" },
  { value: "COP", label: "COP · Peso colombiano", locale: "es-CO" },
  { value: "ARS", label: "ARS · Peso argentino", locale: "es-AR" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["value"];

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

function localeFor(currency: string) {
  return CURRENCIES.find((c) => c.value === currency)?.locale ?? "es-MX";
}

/**
 * `currency` llega como string desde la base de datos, así que se normaliza
 * aquí en vez de confiar en el tipo.
 */
function safeCurrency(currency: string) {
  return /^[A-Z]{3}$/.test(currency) ? currency : DEFAULT_CURRENCY;
}

/** Formatea un monto con el símbolo y separadores de la moneda configurada. */
export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
) {
  const code = safeCurrency(currency);
  return new Intl.NumberFormat(localeFor(code), {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Versión compacta para ejes de gráficas y espacios estrechos ($1.2k). */
export function formatCompactCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
) {
  const code = safeCurrency(currency);
  return new Intl.NumberFormat(localeFor(code), {
    style: "currency",
    currency: code,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Título visible de un gasto. La descripción es opcional, así que cuando falta
 * se usa el nombre de la categoría para no dejar la fila sin texto.
 */
export function formatExpenseTitle(expense: {
  description: string | null;
  category: { name: string };
}) {
  return expense.description?.trim() || expense.category.name;
}

/** True cuando el gasto trae nota propia (y no el nombre de la categoría). */
export function hasExpenseDescription(expense: { description: string | null }) {
  return Boolean(expense.description?.trim());
}

export function formatPercent(value: number) {
  return `${value.toFixed(value < 10 ? 1 : 0)}%`;
}

export const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export function formatMonthLabel(month: number, year: number) {
  const name = MONTH_NAMES[month] ?? "";
  return year === new Date().getFullYear() ? name : `${name} ${year}`;
}

/** "12 de marzo" para el año en curso, "12 de marzo de 2024" en otro caso. */
export function formatExpenseDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  if (isSameDay(value, now)) return "Hoy";

  return format(value, isSameYear(value, now) ? "d 'de' MMMM" : "PPP", {
    locale: es,
  });
}

/** Etiqueta corta para los ejes de las gráficas diarias ("15 ago"). */
export function formatDayTick(date: Date) {
  return format(date, "d MMM", { locale: es });
}

export function formatLongDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return format(value, "PPP", { locale: es });
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** El día de corte se limita a 1-28 para que exista en todos los meses. */
export function normalizeCycleStartDay(cycleStartDay: number) {
  return Math.min(Math.max(Math.trunc(cycleStartDay) || 1, 1), 28);
}

function withCycleMetrics(start: Date, end: Date, reference: Date) {
  const totalDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  const daysLeft = Math.min(
    totalDays,
    Math.max(0, Math.ceil((end.getTime() - reference.getTime()) / MS_PER_DAY)),
  );

  return { start, end, totalDays, daysLeft, daysElapsed: totalDays - daysLeft };
}

/**
 * Ciclo que arranca en el día de corte del mes indicado (el "ancla").
 * Con cycleStartDay = 1 coincide exactamente con el mes calendario.
 */
export function getCycleRangeForAnchor(
  cycleStartDay: number,
  anchorMonth: number,
  anchorYear: number,
  reference = new Date(),
) {
  const day = normalizeCycleStartDay(cycleStartDay);
  const start = new Date(anchorYear, anchorMonth, day, 0, 0, 0, 0);
  const end = new Date(anchorYear, anchorMonth + 1, day, 0, 0, 0, 0);

  return withCycleMetrics(start, end, reference);
}

/**
 * Mes/año en el que arrancó el ciclo que contiene a `reference`. Si todavía no
 * se alcanza el día de corte, el ciclo vigente empezó el mes anterior.
 */
export function getCycleAnchor(cycleStartDay: number, reference = new Date()) {
  const day = normalizeCycleStartDay(cycleStartDay);
  const anchor = new Date(reference.getFullYear(), reference.getMonth(), 1);

  if (reference.getDate() < day) {
    anchor.setMonth(anchor.getMonth() - 1);
  }

  return { month: anchor.getMonth(), year: anchor.getFullYear() };
}

/** Rango del ciclo que contiene a `reference`. */
export function getCycleRange(cycleStartDay: number, reference = new Date()) {
  const anchor = getCycleAnchor(cycleStartDay, reference);
  return getCycleRangeForAnchor(
    cycleStartDay,
    anchor.month,
    anchor.year,
    reference,
  );
}

/**
 * Con corte el día 1 basta el nombre del mes; con cualquier otro el periodo
 * cruza dos meses y hay que mostrar el rango completo.
 */
export function formatPeriodLabel(
  cycleStartDay: number,
  start: Date,
  end: Date,
) {
  if (normalizeCycleStartDay(cycleStartDay) === 1) {
    return formatMonthLabel(start.getMonth(), start.getFullYear());
  }

  const lastDay = new Date(end.getTime() - MS_PER_DAY);
  return `${format(start, "d MMM", { locale: es })} – ${format(lastDay, "d MMM", { locale: es })}`;
}
