"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  ChartPie,
  Plus,
  Receipt,
  Scale,
  Tags,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";

import { CategoryIcon } from "~/components/common/category-icon";
import { EmptyState } from "~/components/common/empty-state";
import { MonthSwitcher } from "~/components/common/month-switcher";
import { StatCard } from "~/components/common/stat-card";
import { useExpenseDialog } from "~/components/expenses/expense-dialog-provider";
import { usePeriod } from "~/components/providers/period-provider";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import { Progress } from "~/components/ui/progress";
import { Skeleton } from "~/components/ui/skeleton";
import { useAppSettings } from "~/hooks/use-app-settings";
import {
  formatExpenseDate,
  formatExpenseTitle,
  formatPercent,
  hasExpenseDescription,
} from "~/lib/format";
import { api } from "~/trpc/react";

export default function Dashboard() {
  const { from, to, label, isCurrentPeriod, daysLeft, totalDays } = usePeriod();
  const { formatAmount, monthlyBudget } = useAppSettings();
  const { openCreate } = useExpenseDialog();

  const { data: categoriesResponse, isLoading: categoriesLoading } =
    api.useCategories.getAll.useQuery();
  const { data: statsResponse, isLoading: statsLoading } =
    api.useExpenses.getPeriodStats.useQuery({ from, to });
  const { data: expensesResponse, isLoading: expensesLoading } =
    api.useExpenses.getAll.useQuery({ from, to });
  const { data: incomeResponse, isLoading: incomeLoading } =
    api.useIncomes.getPeriodStats.useQuery({ from, to });

  const stats = statsResponse?.result;
  const income = incomeResponse?.result;
  const categories = categoriesResponse?.result ?? [];
  const recentExpenses = (expensesResponse?.result ?? []).slice(0, 5);

  const totalSpent = stats?.totalSpent ?? 0;
  const expenseCount = stats?.expenseCount ?? 0;
  const categoryStats = [...(stats?.categoryStats ?? [])].sort(
    (a, b) => b.total - a.total,
  );

  const budgetUsed = monthlyBudget ? (totalSpent / monthlyBudget) * 100 : 0;
  const isOverBudget = monthlyBudget !== null && totalSpent > monthlyBudget;

  // El balance se calcula sobre el neto (ya sin retenciones), que es el dinero
  // con el que realmente se pagan los gastos.
  const netIncome = income?.net ?? 0;
  const balance = netIncome - totalSpent;

  const chartData = categoryStats.map((stat) => ({
    category: stat.category.name,
    amount: stat.total,
    fill: stat.category.color,
  }));

  const chartConfig = categoryStats.reduce<ChartConfig>((config, stat) => {
    config[stat.category.name] = {
      label: stat.category.name,
      color: stat.category.color,
    };
    return config;
  }, {});

  const isLoading =
    statsLoading || expensesLoading || categoriesLoading || incomeLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthSwitcher />
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/income">
              <Plus className="mr-1 size-4" />
              Nuevo ingreso
            </Link>
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-1 size-4" />
            Nuevo gasto
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Ingresos netos"
          value={formatAmount(netIncome)}
          hint={
            income?.isr
              ? `Ya sin ${formatAmount(income.isr)} de ISR retenido`
              : "Lo que cobraste en el periodo"
          }
          icon={Banknote}
          isLoading={isLoading}
        />

        <StatCard
          title="Total gastado"
          value={formatAmount(totalSpent)}
          hint={monthlyBudget ? undefined : label}
          icon={Wallet}
          isLoading={isLoading}
        >
          {monthlyBudget ? (
            <div className="space-y-1.5 pt-1">
              <Progress
                value={Math.min(budgetUsed, 100)}
                aria-label={`Presupuesto usado: ${formatPercent(budgetUsed)} de ${formatAmount(monthlyBudget)}`}
                className={isOverBudget ? "[&>div]:bg-destructive" : undefined}
              />
              <p className="text-muted-foreground text-xs tabular-nums">
                {formatPercent(budgetUsed)} de {formatAmount(monthlyBudget)}
              </p>
            </div>
          ) : null}
        </StatCard>

        <StatCard
          title="Balance"
          value={formatAmount(balance)}
          hint={
            balance < 0
              ? "Gastaste más de lo que cobraste"
              : "Ingresos netos menos gastos"
          }
          icon={Scale}
          isLoading={isLoading}
        />

        <StatCard
          title="Transacciones"
          value={String(expenseCount)}
          hint="Movimientos registrados"
          icon={Receipt}
          isLoading={isLoading}
        />

        <StatCard
          title="Promedio por gasto"
          value={formatAmount(expenseCount ? totalSpent / expenseCount : 0)}
          hint="Monto medio del periodo"
          icon={TrendingUp}
          isLoading={isLoading}
        />

        <StatCard
          title={isCurrentPeriod ? "Días restantes" : "Categorías con gasto"}
          value={
            isCurrentPeriod ? String(daysLeft) : String(categoryStats.length)
          }
          hint={
            isCurrentPeriod
              ? `De un ciclo de ${totalDays} días`
              : "En el periodo seleccionado"
          }
          icon={Tags}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Gastos por categoría</CardTitle>
            <CardDescription>
              Distribución de {label.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="mx-auto aspect-square w-[220px] rounded-full" />
            ) : chartData.length === 0 ? (
              <EmptyState
                icon={ChartPie}
                title="Todavía no hay datos"
                description="Registra gastos en este periodo para ver la distribución."
              />
            ) : (
              <div className="grid items-center gap-6 sm:grid-cols-2">
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-auto h-[220px] w-full max-w-[220px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={chartData}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={55}
                      strokeWidth={4}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.category} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <ul className="space-y-3">
                  {categoryStats.slice(0, 5).map((stat) => {
                    const share = totalSpent
                      ? (stat.total / totalSpent) * 100
                      : 0;
                    return (
                      <li key={stat.category.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              aria-hidden
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: stat.category.color }}
                            />
                            <span className="truncate">
                              {stat.category.name}
                            </span>
                          </span>
                          <span className="shrink-0 font-medium tabular-nums">
                            {formatAmount(stat.total)}
                          </span>
                        </div>
                        <div
                          className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
                          role="progressbar"
                          aria-valuenow={Math.round(share)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${stat.category.name}: ${formatPercent(share)} del total`}
                        >
                          <div
                            className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                            style={{
                              width: `${share}%`,
                              backgroundColor: stat.category.color,
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="space-y-1.5">
              <CardTitle>Gastos recientes</CardTitle>
              <CardDescription>Últimas transacciones</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/expenses">
                Ver todos
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentExpenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Sin movimientos"
                description={`No hay gastos registrados en ${label.toLowerCase()}.`}
                action={
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="mr-1 size-4" />
                    Registrar gasto
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {recentExpenses.map((expense) => (
                  <li key={expense.id} className="flex items-center gap-3">
                    <CategoryIcon
                      icon={expense.category.icon}
                      color={expense.category.color}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {formatExpenseTitle(expense)}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-1 truncate text-xs">
                        {hasExpenseDescription(expense)
                          ? `${expense.category.name} · `
                          : ""}
                        {formatExpenseDate(expense.date)}
                        {expense.image ? (
                          <Receipt
                            role="img"
                            aria-label="Con ticket adjunto"
                            className="size-3 shrink-0"
                          />
                        ) : null}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatAmount(expense.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {!isLoading && categories.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Tags}
              title="Empieza creando categorías"
              description="Las categorías agrupan tus gastos y te permiten definir presupuestos por rubro."
              action={
                <Button asChild>
                  <Link href="/categories">Crear mi primera categoría</Link>
                </Button>
              }
              className="border-0"
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
