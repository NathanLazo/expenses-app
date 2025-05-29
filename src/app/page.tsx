"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { CalendarDays, TrendingUp, Wallet, Plus } from "lucide-react";
import { api } from "~/trpc/react";
import Link from "next/link";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

export default function Dashboard() {
  const [selectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());

  const { data: categories, isLoading: categoriesLoading } =
    api.userCategories.getAll.useQuery();
  const { data: monthlyStats, isLoading: statsLoading } =
    api.useExpenses.getMonthlyStats.useQuery({
      month: selectedMonth,
      year: selectedYear,
    });
  const { data: recentExpenses, isLoading: expensesLoading } =
    api.useExpenses.getAll.useQuery({
      month: selectedMonth,
      year: selectedYear,
    });

  const chartData =
    monthlyStats?.result?.categoryStats?.map((stat) => ({
      category: stat.category.name,
      amount: stat.total,
      fill: stat.category.color,
    })) ?? [];

  const chartConfig =
    monthlyStats?.result?.categoryStats?.reduce((config, stat) => {
      return {
        ...config,
        [stat.category.name.toLowerCase().replace(/\s+/g, "")]: {
          label: stat.category.name,
          color: stat.category.color,
        },
      };
    }, {}) ?? {};

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

  if (categoriesLoading || statsLoading || expensesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="border-primary h-32 w-32 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            <CalendarDays className="mr-1 h-3 w-3" />
            {monthNames[selectedMonth]} {selectedYear}
          </Badge>
          <Button asChild>
            <Link href="/expenses/new">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Gasto
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastado</CardTitle>
            <Wallet className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${monthlyStats?.result?.totalSpent?.toFixed(2) ?? "0.00"}
            </div>
            <p className="text-muted-foreground text-xs">Este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Número de Gastos
            </CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyStats?.result?.expenseCount ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">
              Transacciones registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Categorías Activas
            </CardTitle>
            <Wallet className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories?.result?.length ?? 0}
            </div>
            <p className="text-muted-foreground text-xs">Categorías creadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Promedio por Gasto
            </CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {monthlyStats?.result?.expenseCount
                ? (
                    monthlyStats.result.totalSpent /
                    monthlyStats.result.expenseCount
                  ).toFixed(2)
                : "0.00"}
            </div>
            <p className="text-muted-foreground text-xs">Por transacción</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
            <CardDescription>
              Distribución de gastos del mes actual
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[250px]"
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
                  innerRadius={60}
                  strokeWidth={5}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Gastos Recientes</CardTitle>
            <CardDescription>Últimas transacciones registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentExpenses?.result?.slice(0, 5).map((expense) => (
                <div key={expense.id} className="flex items-center">
                  <div className="bg-primary/10 mr-4 flex h-9 w-9 items-center justify-center rounded-full">
                    <span className="text-sm">{expense.category.icon}</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm leading-none font-medium">
                      {expense.description}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {expense.category.name}
                    </p>
                  </div>
                  <div className="font-medium">
                    ${expense.amount.toFixed(2)}
                  </div>
                </div>
              ))}
              {(!recentExpenses || recentExpenses.result?.length === 0) && (
                <div className="text-muted-foreground py-4 text-center">
                  No hay gastos registrados este mes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
