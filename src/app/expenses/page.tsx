"use client";

import { useMemo, useState } from "react";
import { Plus, Receipt, Search, SlidersHorizontal } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { MonthSwitcher } from "~/components/common/month-switcher";
import { StatCard } from "~/components/common/stat-card";
import { useExpenseDialog } from "~/components/expenses/expense-dialog-provider";
import {
  ExpenseList,
  ExpenseListSkeleton,
} from "~/components/expenses/expense-list";
import { usePeriod } from "~/components/providers/period-provider";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useAppSettings } from "~/hooks/use-app-settings";
import { api } from "~/trpc/react";

const ALL_CATEGORIES = "all";

export default function ExpensesPage() {
  const { month, year, label } = usePeriod();
  const { formatAmount } = useAppSettings();
  const { openCreate } = useExpenseDialog();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>(ALL_CATEGORIES);

  const { data: categoriesResponse } = api.useCategories.getAll.useQuery();
  const categories = categoriesResponse?.result ?? [];

  const { data: expensesResponse, isLoading } = api.useExpenses.getAll.useQuery(
    {
      month,
      year,
      categoryId: categoryId === ALL_CATEGORIES ? undefined : categoryId,
    },
  );

  const expenses = useMemo(
    () => expensesResponse?.result ?? [],
    [expensesResponse],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return expenses;

    return expenses.filter(
      (expense) =>
        expense.description.toLowerCase().includes(query) ||
        expense.category.name.toLowerCase().includes(query),
    );
  }, [expenses, search]);

  const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);
  const average = filtered.length ? total / filtered.length : 0;
  const hasFilters = search.trim() !== "" || categoryId !== ALL_CATEGORIES;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthSwitcher />
        <Button onClick={openCreate} className="sm:w-auto">
          <Plus className="mr-1 size-4" />
          Nuevo gasto
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={`Total de ${label.toLowerCase()}`}
          value={formatAmount(total)}
          hint={hasFilters ? "Con los filtros aplicados" : "Todo el periodo"}
          icon={Receipt}
          isLoading={isLoading}
        />
        <StatCard
          title="Transacciones"
          value={String(filtered.length)}
          hint="Movimientos registrados"
          icon={SlidersHorizontal}
          isLoading={isLoading}
        />
        <StatCard
          title="Promedio por gasto"
          value={formatAmount(average)}
          hint="Monto medio del periodo"
          icon={Receipt}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por descripción o categoría..."
                className="pl-9"
                aria-label="Buscar gastos"
              />
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="sm:w-[220px]" aria-label="Categoría">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>
                  Todas las categorías
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <span className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <ExpenseListSkeleton />
          ) : filtered.length > 0 ? (
            <ExpenseList expenses={filtered} />
          ) : hasFilters ? (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="Ningún gasto coincide con los filtros de este periodo."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setCategoryId(ALL_CATEGORIES);
                  }}
                >
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Receipt}
              title={`Sin gastos en ${label.toLowerCase()}`}
              description="Registra tu primer movimiento del periodo para verlo aquí."
              action={
                <Button onClick={openCreate}>
                  <Plus className="mr-1 size-4" />
                  Registrar gasto
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
