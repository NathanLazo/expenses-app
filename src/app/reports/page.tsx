"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { api } from "~/trpc/react";

export default function ReportsPage() {
  const [selectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const { data: categories } = api.useCategories.getAll.useQuery();
  const { data: monthlyStats } = api.useExpenses.getMonthlyStats.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });
  const { data: expenses } = api.useExpenses.getAll.useQuery({
    month: selectedMonth,
    year: selectedYear,
  });

  // Preparar datos para gráfico de barras por categoría
  const categoryBarData =
    monthlyStats?.result?.categoryStats?.map((stat) => ({
      category: stat.category.name,
      amount: stat.total,
      budget: stat.category.budget ?? 0,
      fill: stat.category.color,
    })) ?? [];

  // Preparar datos para gráfico de línea de gastos diarios
  const dailyExpensesData =
    expenses?.result
      ?.reduce(
        (acc, expense) => {
          const day = new Date(expense.date).getDate();
          const existing = acc.find((item) => item.day === day);
          if (existing) {
            existing.amount += expense.amount;
          } else {
            acc.push({ day, amount: expense.amount });
          }
          return acc;
        },
        [] as { day: number; amount: number }[],
      )
      .sort((a, b) => a.day - b.day) ?? [];

  // Preparar datos para gráfico de área acumulativa
  const cumulativeData = dailyExpensesData.reduce(
    (acc, curr, index) => {
      const cumulative =
        index === 0
          ? curr.amount
          : (acc[index - 1]?.cumulative ?? 0) + curr.amount;
      acc.push({
        day: curr.day,
        daily: curr.amount,
        cumulative,
      });
      return acc;
    },
    [] as { day: number; daily: number; cumulative: number }[],
  );

  // Configuración de charts
  const categoryChartConfig = categoryBarData.reduce<
    Record<string, { label: string; color: string }>
  >((config, item) => {
    const key = item.category.toLowerCase().replace(/\s+/g, "");
    config[key] = {
      label: item.category,
      color: item.fill,
    };
    return config;
  }, {});

  const dailyChartConfig = {
    amount: {
      label: "Gasto Diario",
      color: "hsl(var(--chart-1))",
    },
  };

  const cumulativeChartConfig = {
    daily: {
      label: "Gasto Diario",
      color: "hsl(var(--chart-1))",
    },
    cumulative: {
      label: "Acumulado",
      color: "hsl(var(--chart-2))",
    },
  };

  const pieChartConfig =
    monthlyStats?.result?.categoryStats?.reduce<
      Record<string, { label: string; color: string }>
    >((config, stat) => {
      const key = stat.category.name.toLowerCase().replace(/\s+/g, "");
      config[key] = {
        label: stat.category.name,
        color: stat.category.color,
      };
      return config;
    }, {}) ?? {};

  const pieData =
    monthlyStats?.result?.categoryStats?.map((stat) => ({
      category: stat.category.name,
      amount: stat.total,
      fill: stat.category.color,
    })) ?? [];

  const monthNames = [
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
  ];

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes</h2>
          <p className="text-muted-foreground">
            Análisis detallado de tus gastos
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(Number.parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((month, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-sm">
            <CalendarDays className="mr-1 h-3 w-3" />
            {selectedYear}
          </Badge>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total del Mes</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${monthlyStats?.result?.totalSpent?.toFixed(2) ?? "0.00"}
            </div>
            <p className="text-muted-foreground text-xs">
              {monthlyStats?.result?.expenseCount ?? 0} transacciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Promedio Diario
            </CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {(
                (monthlyStats?.result?.totalSpent ?? 0) / new Date().getDate()
              ).toFixed(2)}
            </div>
            <p className="text-muted-foreground text-xs">
              Basado en días transcurridos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categoría Top</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyStats?.result?.categoryStats?.[0]?.category.name ?? "N/A"}
            </div>
            <p className="text-muted-foreground text-xs">
              $
              {monthlyStats?.result?.categoryStats?.[0]?.total.toFixed(2) ??
                "0.00"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Presupuesto Usado
            </CardTitle>
            <TrendingDown className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const totalBudget =
                  categories?.result?.reduce(
                    (sum, category) => sum + (category.budget ?? 0),
                    0,
                  ) ?? 0;
                const percentage =
                  totalBudget > 0
                    ? ((monthlyStats?.result?.totalSpent ?? 0) / totalBudget) *
                      100
                    : 0;
                return `${percentage.toFixed(1)}%`;
              })()}
            </div>
            <p className="text-muted-foreground text-xs">
              Del presupuesto total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico de barras por categoría */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos vs Presupuesto por Categoría</CardTitle>
            <CardDescription>
              Comparación de gastos reales con presupuestos asignados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoryChartConfig}>
              <BarChart data={categoryBarData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value: string) => value.slice(0, 3)}
                />
                <YAxis />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" />}
                />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
                <Bar dataKey="budget" fill="hsl(var(--muted))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Gráfico de torta */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categoría</CardTitle>
            <CardDescription>
              Porcentaje de gastos por categoría
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={pieChartConfig}
              className="mx-auto aspect-square max-h-[250px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={pieData}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos de tendencias */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gastos diarios */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos Diarios</CardTitle>
            <CardDescription>Evolución de gastos día a día</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={dailyChartConfig}>
              <LineChart data={dailyExpensesData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value}`}
                />
                <YAxis />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
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

        {/* Gastos acumulativos */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos Acumulativos</CardTitle>
            <CardDescription>
              Progresión acumulativa de gastos mensuales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={cumulativeChartConfig}>
              <AreaChart data={cumulativeData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Area
                  dataKey="cumulative"
                  type="monotone"
                  fill="var(--color-cumulative)"
                  fillOpacity={0.4}
                  stroke="var(--color-cumulative)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de resumen por categoría */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Detallado por Categoría</CardTitle>
          <CardDescription>
            Análisis completo de gastos por categoría
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyStats?.result?.categoryStats?.map((stat) => {
              const budgetPercentage = stat.category.budget
                ? (stat.total / stat.category.budget) * 100
                : 0;

              return (
                <div
                  key={stat.category.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: stat.category.color }}
                    >
                      {stat.category.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{stat.category.name}</h4>
                      <p className="text-muted-foreground text-sm">
                        {stat.count} transacciones
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="font-medium">${stat.total.toFixed(2)}</div>
                    {stat.category.budget && (
                      <div className="text-muted-foreground text-sm">
                        {budgetPercentage.toFixed(1)}% del presupuesto
                      </div>
                    )}
                    {budgetPercentage > 100 && (
                      <Badge variant="destructive" className="text-xs">
                        Excedido
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
