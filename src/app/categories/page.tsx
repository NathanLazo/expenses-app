"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Plus, Tags, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import {
  CategoryForm,
  type CategorySubmitValues,
} from "~/components/categories/category-form";
import { CategoryIcon } from "~/components/common/category-icon";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EmptyState } from "~/components/common/empty-state";
import { StatCard } from "~/components/common/stat-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Progress } from "~/components/ui/progress";
import { ResponsiveModal } from "~/components/ui/responsive-modal";
import { Skeleton } from "~/components/ui/skeleton";
import { useAppSettings } from "~/hooks/use-app-settings";
import type { CategoryWithStats } from "~/lib/api-types";
import { formatPercent } from "~/lib/format";
import { api } from "~/trpc/react";

export default function CategoriesPage() {
  const { formatAmount } = useAppSettings();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryWithStats | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CategoryWithStats | null>(
    null,
  );

  const utils = api.useUtils();
  const { data: categoriesResponse, isLoading } =
    api.useCategories.getAll.useQuery();
  const categories = categoriesResponse?.result ?? [];

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
  };

  const invalidate = async () => {
    await Promise.all([
      utils.useCategories.getAll.invalidate(),
      utils.useExpenses.invalidate(),
    ]);
  };

  const createCategory = api.useCategories.create.useMutation({
    onSuccess: async (data) => {
      if (data.status !== 200) {
        toast.error("No se pudo crear la categoría");
        return;
      }
      await invalidate();
      closeForm();
      toast.success("Categoría creada");
    },
    onError: () => toast.error("No se pudo crear la categoría"),
  });

  const updateCategory = api.useCategories.update.useMutation({
    onSuccess: async (data) => {
      if (data.status !== 200) {
        toast.error("No se pudo actualizar la categoría");
        return;
      }
      await invalidate();
      closeForm();
      toast.success("Categoría actualizada");
    },
    onError: () => toast.error("No se pudo actualizar la categoría"),
  });

  const deleteCategory = api.useCategories.delete.useMutation({
    onSuccess: async (data) => {
      if (data.status !== 200) {
        toast.error("No se pudo eliminar la categoría");
        return;
      }
      await invalidate();
      setPendingDelete(null);
      toast.success("Categoría eliminada");
    },
    onError: () => toast.error("No se pudo eliminar la categoría"),
  });

  const handleSubmit = (values: CategorySubmitValues) => {
    if (editing) {
      updateCategory.mutate({ id: editing.id, ...values });
    } else {
      createCategory.mutate(values);
    }
  };

  const totalBudget = categories.reduce(
    (sum, category) => sum + (category.budget ?? 0),
    0,
  );
  const totalSpent = categories.reduce(
    (sum, category) =>
      sum + category.expenses.reduce((acc, item) => acc + item.amount, 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Cada gasto pertenece a una categoría. Asigna presupuestos para seguir
          tu avance del ciclo.
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="mr-1 size-4" />
          Nueva categoría
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Categorías"
          value={String(categories.length)}
          hint="Creadas en total"
          icon={Tags}
          isLoading={isLoading}
        />
        <StatCard
          title="Presupuesto asignado"
          value={formatAmount(totalBudget)}
          hint="Suma de presupuestos por categoría"
          icon={Wallet}
          isLoading={isLoading}
        />
        <StatCard
          title="Gastado en el ciclo"
          value={formatAmount(totalSpent)}
          hint={
            totalBudget
              ? `${formatPercent((totalSpent / totalBudget) * 100)} del presupuesto`
              : "Sin presupuesto definido"
          }
          icon={Wallet}
          isLoading={isLoading}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Aún no tienes categorías"
          description="Crea categorías como Comida, Transporte o Casa para clasificar tus gastos."
          action={
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-1 size-4" />
              Crear categoría
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const spent = category.expenses.reduce(
              (sum, expense) => sum + expense.amount,
              0,
            );
            const usage = category.budget ? (spent / category.budget) * 100 : 0;
            const isOver = Boolean(category.budget) && usage > 100;

            return (
              <Card key={category.id} className="gap-3">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <CategoryIcon icon={category.icon} color={category.color} />
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {category.name}
                      </CardTitle>
                      <p className="text-muted-foreground text-xs">
                        {category._count.expenses}{" "}
                        {category._count.expenses === 1 ? "gasto" : "gastos"} en
                        total
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        aria-label={`Acciones para ${category.name}`}
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(category);
                          setIsFormOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 size-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setPendingDelete(category)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                <CardContent className="space-y-3">
                  {category.description ? (
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {category.description}
                    </p>
                  ) : null}

                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground text-sm">
                      Gastado en el ciclo
                    </span>
                    <span className="font-semibold tabular-nums">
                      {formatAmount(spent)}
                    </span>
                  </div>

                  {category.budget ? (
                    <div className="space-y-1.5">
                      <Progress
                        value={Math.min(usage, 100)}
                        aria-label={`${category.name}: ${formatPercent(usage)} de ${formatAmount(category.budget)}`}
                        className={
                          isOver ? "[&>div]:bg-destructive" : undefined
                        }
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">
                          {formatPercent(usage)} de{" "}
                          {formatAmount(category.budget)}
                        </span>
                        {isOver ? (
                          <Badge variant="destructive" className="text-xs">
                            Excedido
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      Sin presupuesto asignado
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ResponsiveModal
        open={isFormOpen}
        onOpenChange={(open) => (open ? setIsFormOpen(true) : closeForm())}
        title={editing ? "Editar categoría" : "Nueva categoría"}
        description={
          editing
            ? "Actualiza el nombre, la apariencia o el presupuesto."
            : "Define cómo quieres agrupar tus gastos."
        }
      >
        <CategoryForm
          key={editing?.id ?? "new"}
          defaultValues={
            editing
              ? {
                  name: editing.name,
                  description: editing.description ?? "",
                  icon: editing.icon,
                  color: editing.color,
                  budget: editing.budget?.toString() ?? "",
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isPending={createCategory.isPending || updateCategory.isPending}
          submitLabel={editing ? "Guardar cambios" : "Crear categoría"}
        />
      </ResponsiveModal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="¿Eliminar esta categoría?"
        description={
          <>
            Se eliminará <strong>{pendingDelete?.name}</strong> y también sus{" "}
            <strong>{pendingDelete?._count.expenses ?? 0}</strong> gastos
            asociados. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        isPending={deleteCategory.isPending}
        onConfirm={() =>
          pendingDelete && deleteCategory.mutate({ id: pendingDelete.id })
        }
      />
    </div>
  );
}
