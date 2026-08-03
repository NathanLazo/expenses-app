"use client";

import {
  ChartColumnBig,
  DollarSign,
  Receipt,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { CategoryIcon } from "~/components/common/category-icon";
import { moneyTooltipFormatter } from "~/components/common/chart-money-tooltip";
import { EmptyState } from "~/components/common/empty-state";
import { MonthSwitcher } from "~/components/common/month-switcher";
import { StatCard } from "~/components/common/stat-card";
import { usePeriod } from "~/components/providers/period-provider";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useAppSettings } from "~/hooks/use-app-settings";
import { formatPercent } from "~/lib/format";
import { api } from "~/trpc/react";

export default function ReportsPage() {
  const { month, year, label, isCurrentPeriod } = usePeriod();
  const { formatAmount, formatCompactAmount } = useAppSettings();

  const { data: categoriesResponse } = api.useCategories.getAll.useQuery();
  const { data: statsResponse, isLoading: statsLoading } =
    api.useExpenses.getMonthlyStats.useQuery({ month, year });
  const { data: expensesResponse, isLoading: expensesLoading } =
    api.useExpenses.getAll.useQuery({ month, year });

  const isLoading = statsLoading || expensesLoading;
  const stats = statsResponse?.result;
  const expenses = expensesResponse?.result ?? [];
  const totalSpent = stats?.totalSpent ?? 0;
  const expenseCount = stats?.expenseCount ?? 0;

  const categoryStats = [...(stats?.categoryStats ?? [])].sort(
    (a, b) => b.total - a.total,
  );

  // En un mes pasado el promedio se calcula sobre el mes completo, no sobre hoy.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const elapsedDays = isCurrentPeriod ? new Date().getDate() : daysInMonth;
  const dailyAverage = totalSpent / Math.max(elapsedDays, 1);

  const totalBudget =
    categoriesResponse?.result?.reduce(
      (sum, category) => sum + (category.budget ?? 0),
      0,
    ) ?? 0;

  // Sin `fill` en los datos: Recharts lo tomaría del dato y pintaría las dos
  // barras del mismo color, haciendo imposible distinguir gasto de presupuesto.
  const categoryChartData = categoryStats.map((stat) => ({
    category: stat.category.name,
    gastado: stat.total,
    presupuesto: stat.category.budget ?? 0,
  }));

  // La dona sí usa el color de cada categoría, vía <Cell>.
  const pieChartData = categoryStats.map((stat) => ({
    category: stat.category.name,
    gastado: stat.total,
    fill: stat.category.color,
  }));

  const dailyData = Object.values(
    expenses.reduce<Record<number, { day: number; amount: number }>>(
      (acc, expense) => {
        const day = new Date(expense.date).getDate();
        acc[day] ??= { day, amount: 0 };
        acc[day].amount += expense.amount;
        return acc;
      },
      {},
    ),
  ).sort((a, b) => a.day - b.day);

  let running = 0;
  const cumulativeData = dailyData.map((entry) => {
    running += entry.amount;
    return { day: entry.day, acumulado: running };
  });

  const categoryChartConfig: ChartConfig = {
    gastado: { label: "Gastado", color: "var(--chart-1)" },
    presupuesto: { label: "Presupuesto", color: "var(--chart-2)" },
  };

  const dailyChartConfig: ChartConfig = {
    amount: { label: "Gasto del día", color: "var(--chart-1)" },
  };

  const cumulativeChartConfig: ChartConfig = {
    acumulado: { label: "Acumulado", color: "var(--chart-2)" },
  };

  const pieChartConfig = categoryStats.reduce<ChartConfig>((config, stat) => {
    config[stat.category.name] = {
      label: stat.category.name,
      color: stat.category.color,
    };
    return config;
  }, {});

  const hasData = expenseCount > 0;

  return (
    <div className="space-y-6">
      <MonthSwitcher />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={`Total de ${label.toLowerCase()}`}
          value={formatAmount(totalSpent)}
          hint={`${expenseCount} transacciones`}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatCard
          title="Promedio diario"
          value={formatAmount(dailyAverage)}
          hint={
            isCurrentPeriod
              ? `Sobre ${elapsedDays} días transcurridos`
              : `Sobre ${daysInMonth} días del mes`
          }
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <StatCard
          title="Categoría con más gasto"
          value={categoryStats[0]?.category.name ?? "—"}
          hint={
            categoryStats[0]
              ? formatAmount(categoryStats[0].total)
              : "Sin datos en el periodo"
          }
          icon={Trophy}
          isLoading={isLoading}
        />
        <StatCard
          title="Presupuesto usado"
          value={
            totalBudget ? formatPercent((totalSpent / totalBudget) * 100) : "—"
          }
          hint={
            totalBudget
              ? `De ${formatAmount(totalBudget)} asignados`
              : "Asigna presupuestos por categoría"
          }
          icon={Receipt}
          isLoading={isLoading}
        />
      </div>

      {!isLoading && !hasData ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={ChartColumnBig}
              title={`Sin datos en ${label.toLowerCase()}`}
              description="Cuando registres gastos en este periodo verás aquí sus gráficas y tendencias."
              className="border-0"
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Gastado vs presupuesto</CardTitle>
                <CardDescription>
                  Comparación por categoría del periodo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={categoryChartConfig}
                  className="max-h-[280px] w-full"
                >
                  <BarChart data={categoryChartData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value: string) => value.slice(0, 6)}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={64}
                      tickFormatter={(value: number) =>
                        formatCompactAmount(value)
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={moneyTooltipFormatter(
                            categoryChartConfig,
                            formatAmount,
                          )}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="gastado"
                      fill="var(--color-gastado)"
                      radius={4}
                    />
                    <Bar
                      dataKey="presupuesto"
                      fill="var(--color-presupuesto)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución por categoría</CardTitle>
                <CardDescription>
                  Peso de cada categoría en el total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={pieChartConfig}
                  className="mx-auto aspect-square max-h-[280px] w-full"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={moneyTooltipFormatter(
                            pieChartConfig,
                            formatAmount,
                          )}
                        />
                      }
                    />
                    <Pie
                      data={pieChartData}
                      dataKey="gastado"
                      nameKey="category"
                      innerRadius={60}
                      strokeWidth={4}
                    >
                      {pieChartData.map((entry) => (
                        <Cell key={entry.category} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Gasto diario</CardTitle>
                <CardDescription>Movimiento día a día</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={dailyChartConfig}
                  className="max-h-[260px] w-full"
                >
                  <LineChart data={dailyData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={64}
                      tickFormatter={(value: number) =>
                        formatCompactAmount(value)
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={moneyTooltipFormatter(
                            dailyChartConfig,
                            formatAmount,
                          )}
                        />
                      }
                    />
                    <Line
                      dataKey="amount"
                      type="monotone"
                      stroke="var(--color-amount)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gasto acumulado</CardTitle>
                <CardDescription>
                  Cómo se acumula el gasto durante el periodo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={cumulativeChartConfig}
                  className="max-h-[260px] w-full"
                >
                  <AreaChart data={cumulativeData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={64}
                      tickFormatter={(value: number) =>
                        formatCompactAmount(value)
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={moneyTooltipFormatter(
                            cumulativeChartConfig,
                            formatAmount,
                          )}
                        />
                      }
                    />
                    <Area
                      dataKey="acumulado"
                      type="monotone"
                      stroke="var(--color-acumulado)"
                      fill="var(--color-acumulado)"
                      fillOpacity={0.25}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumen por categoría</CardTitle>
              <CardDescription>
                Detalle de gasto, presupuesto y participación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Movimientos</TableHead>
                      <TableHead className="text-right">Gastado</TableHead>
                      <TableHead className="text-right">Presupuesto</TableHead>
                      <TableHead className="text-right">Del total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryStats.map((stat) => {
                      const usage = stat.category.budget
                        ? (stat.total / stat.category.budget) * 100
                        : 0;
                      const share = totalSpent
                        ? (stat.total / totalSpent) * 100
                        : 0;

                      return (
                        <TableRow key={stat.category.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CategoryIcon
                                icon={stat.category.icon}
                                color={stat.category.color}
                                size="sm"
                              />
                              <span className="font-medium">
                                {stat.category.name}
                              </span>
                              {usage > 100 ? (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  Excedido
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {stat.count}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatAmount(stat.total)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-right tabular-nums">
                            {stat.category.budget
                              ? formatAmount(stat.category.budget)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatPercent(share)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
