"use client";

import { useState } from "react";
import {
  Banknote,
  Landmark,
  Percent,
  Plus,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EmptyState } from "~/components/common/empty-state";
import { MonthSwitcher } from "~/components/common/month-switcher";
import { StatCard } from "~/components/common/stat-card";
import {
  IncomeForm,
  type IncomeSubmitValues,
} from "~/components/income/income-form";
import {
  IncomeList,
  IncomeListSkeleton,
} from "~/components/income/income-list";
import { usePeriod } from "~/components/providers/period-provider";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { ResponsiveModal } from "~/components/ui/responsive-modal";
import { useAppSettings } from "~/hooks/use-app-settings";
import { isOkResult, type Income } from "~/lib/api-types";
import { formatIncomeTitle, sumIncomeTotals } from "~/lib/income";
import { api } from "~/trpc/react";

export default function IncomePage() {
  const { from, to, label } = usePeriod();
  const { formatAmount } = useAppSettings();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Income | null>(null);

  const utils = api.useUtils();
  const { data: incomesResponse, isLoading } = api.useIncomes.getAll.useQuery({
    from,
    to,
  });

  const incomes = incomesResponse?.result ?? [];
  const totals = sumIncomeTotals(incomes);
  const hasError = incomesResponse ? !isOkResult(incomesResponse) : false;

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
  };

  const invalidate = () => utils.useIncomes.invalidate();

  const createIncome = api.useIncomes.create.useMutation({
    onSuccess: async (data) => {
      // Los routers devuelven status en vez de lanzar: hay que revisarlo.
      if (!isOkResult(data)) {
        toast.error("No se pudo registrar el ingreso", {
          description: "Inténtalo de nuevo en unos segundos.",
        });
        return;
      }
      await invalidate();
      closeForm();
      toast.success("Ingreso registrado");
    },
    onError: () => toast.error("No se pudo registrar el ingreso"),
  });

  const updateIncome = api.useIncomes.update.useMutation({
    onSuccess: async (data) => {
      if (!isOkResult(data)) {
        toast.error("No se pudo actualizar el ingreso");
        return;
      }
      await invalidate();
      closeForm();
      toast.success("Ingreso actualizado");
    },
    onError: () => toast.error("No se pudo actualizar el ingreso"),
  });

  const deleteIncome = api.useIncomes.delete.useMutation({
    onSuccess: async (data) => {
      if (!isOkResult(data)) {
        toast.error("No se pudo eliminar el ingreso");
        return;
      }
      await invalidate();
      setPendingDelete(null);
      toast.success("Ingreso eliminado");
    },
    onError: () => toast.error("No se pudo eliminar el ingreso"),
  });

  const handleSubmit = (values: IncomeSubmitValues) => {
    if (editing) {
      updateIncome.mutate({ id: editing.id, ...values });
    } else {
      createIncome.mutate(values);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthSwitcher />
        <Button onClick={openCreate} className="sm:w-auto">
          <Plus className="mr-1 size-4" />
          Nuevo ingreso
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={`Neto de ${label.toLowerCase()}`}
          value={formatAmount(totals.net)}
          hint="Lo que llegó a tu cuenta"
          icon={Wallet}
          isLoading={isLoading}
        />
        <StatCard
          title="Cobrado"
          value={formatAmount(totals.base)}
          hint={`${incomes.length} ${incomes.length === 1 ? "cobro" : "cobros"} en el periodo`}
          icon={Banknote}
          isLoading={isLoading}
        />
        <StatCard
          title="IVA trasladado"
          value={formatAmount(totals.iva)}
          hint="Cobrado además de la base"
          icon={Percent}
          isLoading={isLoading}
        />
        <StatCard
          title="ISR retenido"
          value={formatAmount(totals.isr)}
          hint="Te lo retuvo quien pagó"
          icon={Landmark}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <IncomeListSkeleton />
          ) : hasError ? (
            <EmptyState
              icon={TriangleAlert}
              title="No pudimos cargar tus ingresos"
              description="Hubo un problema al consultar el periodo. Vuelve a intentarlo."
              action={
                <Button
                  variant="outline"
                  onClick={() => utils.useIncomes.getAll.invalidate()}
                >
                  Reintentar
                </Button>
              }
            />
          ) : incomes.length > 0 ? (
            <IncomeList
              incomes={incomes}
              onEdit={(income) => {
                setEditing(income);
                setIsFormOpen(true);
              }}
              onDelete={setPendingDelete}
            />
          ) : (
            <EmptyState
              icon={Banknote}
              title={`Sin ingresos en ${label.toLowerCase()}`}
              description="Registra lo que cobraste y, si facturaste, cuánto fue de IVA y de ISR."
              action={
                <Button onClick={openCreate}>
                  <Plus className="mr-1 size-4" />
                  Registrar ingreso
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <ResponsiveModal
        open={isFormOpen}
        onOpenChange={(open) => (open ? setIsFormOpen(true) : closeForm())}
        title={editing ? "Editar ingreso" : "Nuevo ingreso"}
        description={
          editing
            ? "Actualiza el monto, los impuestos o la fecha del cobro."
            : "Registra cuánto cobraste. El IVA y el ISR son opcionales."
        }
      >
        <IncomeForm
          key={editing?.id ?? "new"}
          defaultValues={
            editing
              ? {
                  amount: String(editing.amount),
                  iva: editing.iva !== null ? String(editing.iva) : "",
                  isr: editing.isr !== null ? String(editing.isr) : "",
                  description: editing.description ?? "",
                  date: new Date(editing.date),
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isPending={createIncome.isPending || updateIncome.isPending}
          submitLabel={editing ? "Guardar cambios" : "Registrar ingreso"}
        />
      </ResponsiveModal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="¿Eliminar este ingreso?"
        description={
          <>
            Se eliminará{" "}
            <strong>
              {pendingDelete ? formatIncomeTitle(pendingDelete) : ""}
            </strong>{" "}
            de forma permanente. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        isPending={deleteIncome.isPending}
        onConfirm={() =>
          pendingDelete && deleteIncome.mutate({ id: pendingDelete.id })
        }
      />
    </div>
  );
}
