"use client";

import { useState } from "react";
import { CalendarClock, Coins, Palette } from "lucide-react";
import { toast } from "sonner";

import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  formatCurrency,
  formatLongDate,
  getCycleRange,
} from "~/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

type AppSettings = NonNullable<RouterOutputs["useSettings"]["get"]["result"]>;

export default function SettingsPage() {
  const { data: settingsResponse, isLoading } = api.useSettings.get.useQuery();

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return <SettingsForm settings={settingsResponse?.result ?? null} />;
}

/**
 * El formulario se monta sólo cuando los datos ya existen y toma de ellos su
 * estado inicial. Sincronizarlo con un `useEffect` después del montaje rompía
 * los `Select` de Radix, que perdían el valor recibido tarde.
 */
function SettingsForm({ settings }: { settings: AppSettings | null }) {
  const [form, setForm] = useState({
    cycleStartDay: String(settings?.cycleStartDay ?? 1),
    monthlyBudget: settings?.monthlyBudget?.toString() ?? "",
    currency: settings?.currency ?? DEFAULT_CURRENCY,
  });

  const utils = api.useUtils();

  const updateSettings = api.useSettings.update.useMutation({
    onSuccess: async (data) => {
      if (data.status !== 200) {
        toast.error("No se pudo guardar la configuración");
        return;
      }
      await utils.useSettings.get.invalidate();
      toast.success("Configuración guardada");
    },
    onError: () => toast.error("No se pudo guardar la configuración"),
  });

  const budgetValue = form.monthlyBudget
    ? Number.parseFloat(form.monthlyBudget)
    : undefined;
  const isBudgetInvalid = budgetValue !== undefined && budgetValue <= 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (isBudgetInvalid) {
      toast.error("El presupuesto debe ser mayor a 0");
      return;
    }

    updateSettings.mutate({
      cycleStartDay: Number.parseInt(form.cycleStartDay, 10),
      monthlyBudget: budgetValue,
      currency: form.currency,
    });
  };

  const cycle = getCycleRange(Number.parseInt(form.cycleStartDay, 10) || 1);

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="size-4" />
            Presupuesto y moneda
          </CardTitle>
          <CardDescription>
            La moneda se aplica a todos los montos de la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, currency: value }))
                  }
                >
                  <SelectTrigger id="currency" className="w-full">
                    {/* Etiqueta explícita: no depende de que el contenido del
                        select se haya abierto alguna vez para mostrarse. */}
                    <SelectValue>
                      {CURRENCIES.find(
                        (currency) => currency.value === form.currency,
                      )?.label ?? form.currency}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-sm">
                  Ejemplo: {formatCurrency(1234.5, form.currency)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyBudget">
                  Presupuesto mensual total{" "}
                  <span className="text-muted-foreground font-normal">
                    (opcional)
                  </span>
                </Label>
                <Input
                  id="monthlyBudget"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="tabular-nums"
                  value={form.monthlyBudget}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      monthlyBudget: event.target.value,
                    }))
                  }
                  aria-invalid={isBudgetInvalid}
                />
                <p className="text-muted-foreground text-sm">
                  {isBudgetInvalid
                    ? "El presupuesto debe ser mayor a 0."
                    : "Se muestra como barra de avance en el inicio."}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="cycleStartDay">Día de inicio del ciclo</Label>
              <Select
                value={form.cycleStartDay}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, cycleStartDay: value }))
                }
              >
                <SelectTrigger id="cycleStartDay" className="w-full sm:w-72">
                  <SelectValue>
                    Día {form.cycleStartDay} de cada mes
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, index) => index + 1).map(
                    (day) => (
                      <SelectItem key={day} value={String(day)}>
                        Día {day} de cada mes
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-sm">
                Útil si cobras a mitad de mes: el inicio, los gastos y los
                reportes se agrupan por este ciclo, no por mes calendario.
              </p>
            </div>

            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4" />
            Ciclo actual
          </CardTitle>
          <CardDescription>
            Calculado con el día de corte seleccionado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Inició el</span>
            <span className="font-medium">{formatLongDate(cycle.start)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Próximo reinicio</span>
            <span className="font-medium">{formatLongDate(cycle.end)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Días restantes</span>
            <span className="font-medium tabular-nums">
              {cycle.daysLeft} de {cycle.totalDays}
            </span>
          </div>
          {budgetValue && !isBudgetInvalid ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Disponible por día</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(
                  budgetValue / Math.max(cycle.totalDays, 1),
                  form.currency,
                )}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-4" />
            Apariencia
          </CardTitle>
          <CardDescription>
            Elige el tema de la interfaz. &quot;Sistema&quot; sigue la
            configuración de tu dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>
    </div>
  );
}
