"use client";

import {
  ChartColumnBig,
  DollarSign,
  Landmark,
  Receipt,
  TrendingUp,
  Trophy,
  Users,
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
import { formatDayTick, formatPercent } from "~/lib/format";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function ReportsPage() {
  const {
    from,
    to,
    label,
    month,
    year,
    isCurrentPeriod,
    totalDays,
    daysElapsed,
  } = usePeriod();
  const { formatAmount, formatCompactAmount } = useAppSettings();

  const { data: categoriesResponse } = api.useCategories.getAll.useQuery();
  const { data: statsResponse, isLoading: statsLoading } =
    api.useExpenses.getPeriodStats.useQuery({ from, to });
  const { data: expensesResponse, isLoading: expensesLoading } =
    api.useExpenses.getAll.useQuery({ from, to });

  // La tendencia se ancla al periodo que el usuario tiene seleccionado: si
  // navega a marzo, la serie termina en marzo. Los parámetros son primitivas,
  // así que React Query cachea una entrada por ancla.
  const { data: trendResponse, isLoading: trendLoading } =
    api.useAnalytics.getTrend.useQuery({
      count: 6,
      anchorMonth: month,
      anchorYear: year,
    });
  const { data: byClientResponse, isLoading: byClientLoading } =
    api.useAnalytics.getIncomeByClient.useQuery({ from, to });
  const { data: reserveResponse, isLoading: reserveLoading } =
    api.useAnalytics.getTaxReserve.useQuery({ from, to });

  const trend = trendResponse?.result?.cycles ?? [];
  const byClient = byClientResponse?.result;
  const reserve = reserveResponse?.result;

  const trendChartData = trend.map((cycle) => ({
    label: cycle.label,
    ingreso: cycle.income.net,
    gasto: cycle.expenses.total,
    isPartial: cycle.isPartial,
  }));

  const trendChartConfig: ChartConfig = {
    ingreso: { label: "Ingreso neto", color: "var(--chart-1)" },
    gasto: { label: "Gasto", color: "var(--chart-3)" },
  };

  const isLoading = statsLoading || expensesLoading;
  const stats = statsResponse?.result;
  const expenses = expensesResponse?.result ?? [];
  const totalSpent = stats?.totalSpent ?? 0;
  const expenseCount = stats?.expenseCount ?? 0;

  const categoryStats = [...(stats?.categoryStats ?? [])].sort(
    (a, b) => b.total - a.total,
  );

  // En un periodo pasado el promedio se calcula sobre el ciclo completo; en el
  // vigente, sólo sobre los días ya transcurridos.
  const elapsedDays = isCurrentPeriod ? Math.max(daysElapsed, 1) : totalDays;
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

  /*
   * Se agrupa por fecha completa y no por número de día: un ciclo que cruza
   * dos meses repetiría los días (15..31 y luego 1..14) y el orden numérico
   * mezclaría ambos meses.
   */
  const dailyData = Object.values(
    expenses.reduce<
      Record<string, { time: number; day: string; amount: number }>
    >((acc, expense) => {
      const date = new Date(expense.date);
      const key = date.toDateString();
      acc[key] ??= {
        time: date.getTime(),
        day: formatDayTick(date),
        amount: 0,
      };
      acc[key].amount += expense.amount;
      return acc;
    }, {}),
  ).sort((a, b) => a.time - b.time);

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
              : `Sobre los ${totalDays} días del ciclo`
          }
          icon={TrendingUp}
          isLoading={isLoading}
        />
        <StatCard
          title="Categoría con más gasto"
          value={categoryStats[0]?.category.name ?? "-"}
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
            totalBudget ? formatPercent((totalSpent / totalBudget) * 100) : "-"
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

      {/* Los bloques de ingreso van antes del corte por `hasData`, que sólo
          mira gastos: sin gastos pero con cobros, esta parte sigue teniendo
          algo que contar. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ingreso contra gasto</CardTitle>
            <CardDescription>
              Los últimos 6 periodos hasta {label.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[260px] w-full rounded-lg" />
            ) : trendChartData.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="Todavía no hay serie"
                description="Registra movimientos para ver cómo evolucionan tus periodos."
              />
            ) : (
              <ChartContainer
                config={trendChartConfig}
                className="max-h-[340px] w-full"
              >
                <BarChart data={trendChartData} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
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
                          trendChartConfig,
                          formatAmount,
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {/* El ciclo en curso va atenuado: sin eso su media barra
                      parece una caída real frente a los periodos cerrados. */}
                  <Bar dataKey="ingreso" fill="var(--color-ingreso)" radius={4}>
                    {trendChartData.map((entry) => (
                      <Cell
                        key={entry.label}
                        fillOpacity={entry.isPartial ? 0.45 : 1}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="gasto" fill="var(--color-gasto)" radius={4}>
                    {trendChartData.map((entry) => (
                      <Cell
                        key={entry.label}
                        fillOpacity={entry.isPartial ? 0.45 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
            {trend.some((cycle) => cycle.isPartial) ? (
              <p className="text-muted-foreground mt-3 text-xs">
                El periodo en curso va atenuado porque todavía no cierra.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="text-brand size-4 shrink-0" />
              Apartado sugerido
            </CardTitle>
            <CardDescription>
              Del IVA que cobraste en {label.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {reserveLoading ? (
              <>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-20 w-full" />
              </>
            ) : reserve ? (
              <>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatAmount(reserve.reservaSugerida)}
                </p>
                <dl className="space-y-1 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted-foreground">IVA que cobraste</dt>
                    <dd className="tabular-nums">
                      {formatAmount(reserve.ivaTrasladadoCobrado)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted-foreground">
                      IVA de gastos capturado
                    </dt>
                    <dd className="tabular-nums">
                      - {formatAmount(reserve.ivaAcreditableCapturado)}
                    </dd>
                  </div>
                </dl>

                <p className="text-muted-foreground text-xs">
                  {reserve.coverage.expensesConIvaCapturado} de{" "}
                  {reserve.coverage.expensesInRange} gastos del periodo tienen
                  IVA capturado.
                </p>

                {/* Las salvedades vienen del servidor y se muestran siempre,
                    no detrás de un tooltip: son lo que impide leer esta cifra
                    como un monto a declarar. */}
                <ul className="text-muted-foreground space-y-1.5 border-t pt-3 text-xs">
                  {reserve.disclaimers.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                No pudimos calcular el apartado de este periodo.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>De dónde vino el dinero</CardTitle>
          <CardDescription>
            Reparto del ingreso neto de {label.toLowerCase()} por cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byClientLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : !byClient || byClient.clients.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin cobros en el periodo"
              description="Cuando registres ingresos verás aquí de qué cliente vino cada peso."
            />
          ) : (
            <ul className="space-y-3">
              {byClient.clients.map((client) => (
                <li
                  key={client.clientId ?? "sin-cliente"}
                  className="space-y-1.5"
                >
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden>{client.icon ?? "•"}</span>
                      <span className="truncate">{client.name}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {client.count} {client.count === 1 ? "cobro" : "cobros"}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatAmount(client.net)}
                    </span>
                  </div>
                  <div
                    className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
                    role="progressbar"
                    aria-valuenow={Math.round(client.share)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${client.name}: ${formatPercent(client.share)} del ingreso`}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                      style={{
                        width: `${Math.max(client.share, 0)}%`,
                        backgroundColor: client.color ?? "var(--chart-3)",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
                  className="aspect-auto h-[280px] w-full"
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
                  className="mx-auto aspect-auto h-[280px] w-full max-w-[280px]"
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
                  className="aspect-auto h-[260px] w-full"
                >
                  <LineChart data={dailyData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
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
                  className="aspect-auto h-[260px] w-full"
                >
                  <AreaChart data={cumulativeData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={24}
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
                              : "-"}
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
