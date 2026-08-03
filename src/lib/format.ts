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

export function formatLongDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return format(value, "PPP", { locale: es });
}

/**
 * Rango del ciclo de presupuesto que contiene a `reference`, según el día de
 * corte configurado. Con cycleStartDay = 1 equivale al mes calendario.
 */
export function getCycleRange(cycleStartDay: number, reference = new Date()) {
  const day = Math.min(Math.max(cycleStartDay, 1), 28);
  const start = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    day,
    0,
    0,
    0,
    0,
  );

  // Si aún no llegamos al día de corte, el ciclo vigente empezó el mes pasado.
  if (reference.getDate() < day) {
    start.setMonth(start.getMonth() - 1);
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.max(
    0,
    Math.ceil((end.getTime() - reference.getTime()) / msPerDay),
  );
  const totalDays = Math.round((end.getTime() - start.getTime()) / msPerDay);

  return { start, end, daysLeft, totalDays, daysElapsed: totalDays - daysLeft };
}
