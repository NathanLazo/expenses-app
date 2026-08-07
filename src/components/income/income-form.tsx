"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { useAppSettings } from "~/hooks/use-app-settings";
import { formatLongDate } from "~/lib/format";
import {
  getIncomeTotals,
  ISR_RETENTION_RATE,
  IVA_RATE,
  roundToCents,
} from "~/lib/income";
import { cn } from "~/lib/utils";
import { es } from "date-fns/locale";

/** Campo de impuesto: vacío es válido, cualquier número debe ser >= 0. */
const taxField = z
  .string()
  .refine((value) => value === "" || Number.parseFloat(value) >= 0, {
    message: "No puede ser negativo",
  });

const incomeFormSchema = z
  .object({
    amount: z
      .string()
      .min(1, "Ingresa cuánto cobraste")
      .refine((value) => Number.parseFloat(value) > 0, {
        message: "El monto debe ser mayor a 0",
      }),
    iva: taxField,
    isr: taxField,
    description: z.string().trim().max(120, "Máximo 120 caracteres"),
    date: z.date(),
  })
  // Una retención mayor a lo facturado dejaría un neto negativo, que no
  // describe ningún cobro real.
  .superRefine((values, ctx) => {
    const base = Number.parseFloat(values.amount);
    const iva = Number.parseFloat(values.iva);
    const isr = Number.parseFloat(values.isr);

    if (!Number.isFinite(base) || !Number.isFinite(isr)) return;

    const invoiced = base + (Number.isFinite(iva) ? iva : 0);
    if (isr > invoiced) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["isr"],
        message: "La retención no puede ser mayor al total facturado",
      });
    }
  });

export type IncomeFormValues = z.infer<typeof incomeFormSchema>;

export type IncomeSubmitValues = {
  amount: number;
  iva: number | null;
  isr: number | null;
  description: string | null;
  date: Date;
};

type IncomeFormProps = {
  defaultValues?: Partial<IncomeFormValues>;
  onSubmit: (values: IncomeSubmitValues) => void;
  onCancel: () => void;
  isPending?: boolean;
  submitLabel?: string;
};

/** Lee un campo numérico del formulario tratando lo inválido como cero. */
function readNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Campo vacío significa "no aplica", no "cero". */
function readOptionalNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function IncomeForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  submitLabel = "Guardar ingreso",
}: IncomeFormProps) {
  const { formatAmount } = useAppSettings();

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      amount: "",
      iva: "",
      isr: "",
      description: "",
      date: new Date(),
      ...defaultValues,
    },
  });

  const base = readNumber(form.watch("amount"));
  const totals = getIncomeTotals({
    amount: base,
    iva: readOptionalNumber(form.watch("iva")),
    isr: readOptionalNumber(form.watch("isr")),
  });

  const handleSubmit = form.handleSubmit((values) =>
    onSubmit({
      amount: Number.parseFloat(values.amount),
      iva: readOptionalNumber(values.iva),
      isr: readOptionalNumber(values.isr),
      description: values.description.trim() || null,
      date: values.date,
    }),
  );

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto cobrado</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  autoFocus
                  className="text-lg font-medium tabular-nums"
                />
              </FormControl>
              <FormDescription>
                Lo que cobraste antes de impuestos. Si facturaste, es el
                subtotal.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="iva"
            render={({ field }) => (
              <FormItem>
                {/* "(opcional)" vive en la descripción y no en la etiqueta:
                    en la columna angosta partía el renglón en dos. */}
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>IVA</FormLabel>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    disabled={base === 0}
                    aria-label="Calcular el IVA como 16% del monto cobrado"
                    onClick={() =>
                      field.onChange(String(roundToCents(base * IVA_RATE)))
                    }
                  >
                    Usar 16%
                  </Button>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="tabular-nums"
                  />
                </FormControl>
                <FormDescription>
                  Opcional. Se suma a lo que cobraste.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isr"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>ISR retenido</FormLabel>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    disabled={base === 0}
                    aria-label="Calcular el ISR como 10% del monto cobrado"
                    onClick={() =>
                      field.onChange(
                        String(roundToCents(base * ISR_RETENTION_RATE)),
                      )
                    }
                  >
                    Usar 10%
                  </Button>
                </div>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="tabular-nums"
                  />
                </FormControl>
                <FormDescription>
                  Opcional. Lo que te retuvo quien te pagó.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Concepto</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={2}
                  placeholder="Ej: Factura 128, diseño de marca"
                  className="resize-none"
                />
              </FormControl>
              <FormDescription>
                Opcional. Sirve para reconocer el cobro en la lista.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha de cobro</FormLabel>
              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {field.value
                          ? formatLongDate(field.value)
                          : "Selecciona una fecha"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => date && field.onChange(date)}
                      disabled={(date) => date > new Date()}
                      locale={es}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => field.onChange(new Date())}
                >
                  Hoy
                </Button>
              </div>
              <FormDescription>
                No puedes registrar cobros con fecha futura.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* El desglose evita la duda de siempre: qué se suma, qué se resta y
            cuánto termina llegando a la cuenta. */}
        <div className="bg-muted/50 space-y-2 rounded-lg border p-3 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground">Cobrado</span>
            <span className="tabular-nums">{formatAmount(totals.base)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground">IVA trasladado</span>
            <span className="tabular-nums">+ {formatAmount(totals.iva)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-muted-foreground">ISR retenido</span>
            <span className="tabular-nums">- {formatAmount(totals.isr)}</span>
          </div>
          <Separator />
          <div className="flex items-baseline justify-between gap-2 font-medium">
            <span>Te queda</span>
            <span className="tabular-nums">{formatAmount(totals.net)}</span>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
