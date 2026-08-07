"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Tags } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EmptyState } from "~/components/common/empty-state";
import {
  ExpenseForm,
  type ExpenseSubmitValues,
} from "~/components/expenses/expense-form";
import { Button } from "~/components/ui/button";
import { ResponsiveModal } from "~/components/ui/responsive-modal";
import { Skeleton } from "~/components/ui/skeleton";
import type { ExpenseWithCategory } from "~/lib/api-types";
import { formatExpenseTitle } from "~/lib/format";
import { api } from "~/trpc/react";

type ExpenseDialogContextValue = {
  openCreate: () => void;
  openEdit: (expense: ExpenseWithCategory) => void;
  requestDelete: (expense: ExpenseWithCategory) => void;
};

const ExpenseDialogContext = createContext<ExpenseDialogContextValue | null>(
  null,
);

/**
 * Punto único de creación, edición y borrado de gastos. Vive en el shell, así
 * que cualquier pantalla (o el botón global del header) abre el mismo
 * formulario sin duplicar estado ni mutaciones.
 */
export function ExpenseDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState<ExpenseWithCategory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] =
    useState<ExpenseWithCategory | null>(null);

  const utils = api.useUtils();
  const { data: categoriesResponse, isLoading: categoriesLoading } =
    api.useCategories.getAll.useQuery();
  const categories = categoriesResponse?.result ?? [];

  const invalidate = useCallback(async () => {
    await Promise.all([
      utils.useExpenses.invalidate(),
      utils.useCategories.getAll.invalidate(),
    ]);
  }, [utils]);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditing(null);
  }, []);

  const createExpense = api.useExpenses.create.useMutation({
    onSuccess: async (data) => {
      // Los routers devuelven status en vez de lanzar: hay que revisarlo.
      if (data.status !== 200) {
        toast.error("No se pudo registrar el gasto", {
          description: "Inténtalo de nuevo en unos segundos.",
        });
        return;
      }
      await invalidate();
      closeForm();
      toast.success("Gasto registrado");
    },
    onError: () => toast.error("No se pudo registrar el gasto"),
  });

  const updateExpense = api.useExpenses.update.useMutation({
    onSuccess: async (data) => {
      if (data.status !== 200) {
        toast.error("No se pudo actualizar el gasto");
        return;
      }
      await invalidate();
      closeForm();
      toast.success("Gasto actualizado");
    },
    onError: () => toast.error("No se pudo actualizar el gasto"),
  });

  const deleteExpense = api.useExpenses.delete.useMutation({
    onSuccess: async (data) => {
      if (data.status !== 200) {
        toast.error("No se pudo eliminar el gasto");
        return;
      }
      await invalidate();
      setPendingDelete(null);
      toast.success("Gasto eliminado");
    },
    onError: () => toast.error("No se pudo eliminar el gasto"),
  });

  const value = useMemo<ExpenseDialogContextValue>(
    () => ({
      openCreate: () => {
        setEditing(null);
        setIsFormOpen(true);
      },
      openEdit: (expense) => {
        setEditing(expense);
        setIsFormOpen(true);
      },
      requestDelete: (expense) => setPendingDelete(expense),
    }),
    [],
  );

  const handleSubmit = (values: ExpenseSubmitValues) => {
    if (editing) {
      updateExpense.mutate({ id: editing.id, ...values });
    } else {
      createExpense.mutate(values);
    }
  };

  return (
    <ExpenseDialogContext.Provider value={value}>
      {children}

      <ResponsiveModal
        open={isFormOpen}
        onOpenChange={(open) => (open ? setIsFormOpen(true) : closeForm())}
        title={editing ? "Editar gasto" : "Nuevo gasto"}
        description={
          editing
            ? "Actualiza los datos de esta transacción."
            : "Registra un movimiento en el periodo actual."
        }
      >
        {categoriesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="Primero crea una categoría"
            description="Los gastos se organizan por categoría. Crea al menos una para empezar a registrar."
            action={
              <Button asChild onClick={closeForm}>
                <Link href="/categories">Ir a categorías</Link>
              </Button>
            }
          />
        ) : (
          <ExpenseForm
            key={editing?.id ?? "new"}
            categories={categories}
            defaultValues={
              editing
                ? {
                    amount: String(editing.amount),
                    iva: editing.iva !== null ? String(editing.iva) : "",
                    description: editing.description ?? "",
                    categoryId: editing.categoryId,
                    date: new Date(editing.date),
                    image: editing.image,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            onCancel={closeForm}
            isPending={createExpense.isPending || updateExpense.isPending}
            submitLabel={editing ? "Guardar cambios" : "Registrar gasto"}
          />
        )}
      </ResponsiveModal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="¿Eliminar este gasto?"
        description={
          <>
            Se eliminará{" "}
            <strong>
              {pendingDelete ? formatExpenseTitle(pendingDelete) : ""}
            </strong>{" "}
            de forma permanente. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        isPending={deleteExpense.isPending}
        onConfirm={() =>
          pendingDelete && deleteExpense.mutate({ id: pendingDelete.id })
        }
      />
    </ExpenseDialogContext.Provider>
  );
}

export function useExpenseDialog() {
  const context = useContext(ExpenseDialogContext);
  if (!context) {
    throw new Error(
      "useExpenseDialog debe usarse dentro de <ExpenseDialogProvider />",
    );
  }
  return context;
}
