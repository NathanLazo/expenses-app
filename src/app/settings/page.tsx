"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    cycleStartDay: 1,
    monthlyBudget: "",
    currency: "USD",
  });

  const { data: settings, isLoading } = api.useSettings.get.useQuery();
  const updateSettings = api.useSettings.update.useMutation({
    onSuccess: () => {
      toast.success("Configuración guardada", {
        description: "Los cambios se han guardado exitosamente.",
      });
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        cycleStartDay: settings.result?.cycleStartDay ?? 1,
        monthlyBudget: settings.result?.monthlyBudget?.toString() ?? "",
        currency: settings.result?.currency ?? "USD",
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateSettings.mutate({
      cycleStartDay: formData.cycleStartDay,
      monthlyBudget: formData.monthlyBudget
        ? Number.parseFloat(formData.monthlyBudget)
        : undefined,
      currency: formData.currency,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="border-primary h-32 w-32 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">
          Personaliza tu experiencia de gestión de gastos
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ciclo de Presupuesto</CardTitle>
            <CardDescription>
              Configura cuándo se reinicia tu ciclo mensual de gastos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cycleStartDay">
                  Día de inicio del ciclo mensual
                </Label>
                <Select
                  value={formData.cycleStartDay.toString()}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      cycleStartDay: Number.parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Día {day} de cada mes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-sm">
                  El ciclo se reiniciará cada día {formData.cycleStartDay} del
                  mes
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyBudget">
                  Presupuesto mensual total (opcional)
                </Label>
                <Input
                  id="monthlyBudget"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.monthlyBudget}
                  onChange={(e) =>
                    setFormData({ ...formData, monthlyBudget: e.target.value })
                  }
                />
                <p className="text-muted-foreground text-sm">
                  Establece un límite general para todos tus gastos mensuales
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="MXN">MXN ($)</SelectItem>
                    <SelectItem value="COP">COP ($)</SelectItem>
                    <SelectItem value="ARS">ARS ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Ciclo Actual</CardTitle>
            <CardDescription>
              Detalles sobre tu configuración actual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                Próximo reinicio de ciclo:
              </span>
              <span className="text-sm font-medium">
                {new Date(
                  new Date().getFullYear(),
                  new Date().getMonth() + 1,
                  formData.cycleStartDay,
                ).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                Días restantes en ciclo actual:
              </span>
              <span className="text-sm font-medium">
                {(() => {
                  const today = new Date();
                  const nextCycle = new Date(
                    today.getFullYear(),
                    today.getMonth() + 1,
                    formData.cycleStartDay,
                  );
                  const diffTime = nextCycle.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays;
                })()}{" "}
                días
              </span>
            </div>
            {formData.monthlyBudget && (
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Presupuesto mensual:
                </span>
                <span className="text-sm font-medium">
                  ${Number.parseFloat(formData.monthlyBudget).toFixed(2)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
