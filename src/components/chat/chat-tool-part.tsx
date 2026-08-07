"use client";

import {
  AlertTriangle,
  Banknote,
  Check,
  FolderPlus,
  Loader2,
  PencilLine,
  PieChart,
  Plus,
  Search,
  Tags,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { CategoryIcon } from "~/components/common/category-icon";
import { ReceiptViewer } from "~/components/expenses/receipt-viewer";
import { Button } from "~/components/ui/button";
import { useAppSettings } from "~/hooks/use-app-settings";
import type { ChatMessagePart } from "~/lib/chat-types";
import { formatExpenseDate } from "~/lib/format";
import { formatIncomeTitle } from "~/lib/income";
import { cn } from "~/lib/utils";

/**
 * Las tools devuelven "YYYY-MM-DD". `new Date()` leería eso como UTC y en
 * América movería el gasto un día hacia atrás, así que se arma en local.
 */
function parseToolDate(value: string) {
  return new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
    12,
  );
}

/** Línea discreta para lo que el asistente está consultando por su cuenta. */
function ToolStatus({
  icon: Icon,
  label,
  pending = false,
}: {
  icon: LucideIcon;
  label: string;
  pending?: boolean;
}) {
  return (
    <p className="chat-enter text-muted-foreground flex items-center gap-2 text-sm">
      {pending ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin" />
      ) : (
        <Icon className="size-3.5 shrink-0" />
      )}
      {label}
    </p>
  );
}

function ToolError({ message }: { message: string }) {
  return (
    <p className="text-destructive chat-enter flex items-start gap-2 text-sm">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}

/**
 * Tarjeta base de las acciones. El borde separa estructura (cabecera, cuerpo,
 * botones); la elevación la da la sombra.
 */
function ActionCard({
  icon: Icon,
  title,
  tone = "default",
  children,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  tone?: "default" | "success" | "destructive" | "muted";
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        "chat-enter bg-card overflow-hidden rounded-2xl border shadow-sm",
        tone === "destructive" && "border-destructive/40",
        tone === "success" && "border-emerald-500/40",
        tone === "muted" && "opacity-70 shadow-none",
      )}
    >
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            tone === "destructive" && "text-destructive",
            tone === "success" && "text-emerald-600 dark:text-emerald-400",
            tone === "default" && "text-muted-foreground",
            tone === "muted" && "text-muted-foreground",
          )}
        />
        <h3 className="text-xs font-medium tracking-wide uppercase">{title}</h3>
      </header>
      {children}
      {footer}
    </section>
  );
}

type ExpensePreview = {
  amount: number;
  description?: string | null;
  date: string;
  image?: string | null;
  category?: { name: string; icon: string; color: string } | null;
};

/** Resumen del gasto: la fila que el usuario revisa antes de confirmar. */
function ExpenseSummary({ expense }: { expense: ExpensePreview }) {
  const { formatAmount } = useAppSettings();
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const title =
    expense.description?.trim() ?? expense.category?.name ?? "Gasto";

  return (
    <div className="flex items-center gap-3 p-3">
      {expense.category ? (
        <CategoryIcon
          icon={expense.category.icon}
          color={expense.category.color}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        <p className="text-muted-foreground truncate text-xs">
          {expense.category ? `${expense.category.name} · ` : ""}
          {formatExpenseDate(parseToolDate(expense.date))}
        </p>
      </div>

      {expense.image ? (
        <>
          <button
            type="button"
            onClick={() => setIsReceiptOpen(true)}
            aria-label={`Ver el ticket de ${title}`}
            className="focus-visible:ring-ring size-10 shrink-0 overflow-hidden rounded-md transition-opacity duration-150 hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expense.image}
              alt=""
              className="image-outline size-full rounded-md object-cover"
            />
          </button>
          <ReceiptViewer
            url={isReceiptOpen ? expense.image : null}
            onClose={() => setIsReceiptOpen(false)}
            title={title}
          />
        </>
      ) : null}

      <p className="shrink-0 text-lg font-semibold tabular-nums">
        {formatAmount(expense.amount)}
      </p>
    </div>
  );
}

type IncomePreview = {
  amount: number;
  iva?: number | null;
  isr?: number | null;
  /** Lo calcula el servidor; mientras la tool no responde se deriva aquí. */
  net?: number;
  description?: string | null;
  date: string;
};

/**
 * Resumen del ingreso. A diferencia del gasto son tres cifras y no una, así que
 * el desglose va explícito: el usuario tiene que poder verificar que la base es
 * el subtotal y no el total de la factura antes de confirmar.
 */
function IncomeSummary({ income }: { income: IncomePreview }) {
  const { formatAmount } = useAppSettings();

  const iva = income.iva ?? null;
  const isr = income.isr ?? null;
  const net = income.net ?? income.amount + (iva ?? 0) - (isr ?? 0);

  const details =
    iva === null && isr === null
      ? ["Sin impuestos"]
      : [
          `Base ${formatAmount(income.amount)}`,
          iva !== null ? `IVA ${formatAmount(iva)}` : null,
          isr !== null ? `ISR ${formatAmount(isr)}` : null,
        ].filter(Boolean);

  return (
    <div className="space-y-1 p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate font-medium">
          {formatIncomeTitle({ description: income.description ?? null })}
        </p>
        <p className="shrink-0 text-lg font-semibold tabular-nums">
          {formatAmount(net)}
        </p>
      </div>
      <p className="text-muted-foreground truncate text-xs">
        {formatExpenseDate(parseToolDate(income.date))} · {details.join(" · ")}
      </p>
    </div>
  );
}

function ConfirmFooter({
  confirmLabel,
  destructive = false,
  onRespond,
}: {
  confirmLabel: string;
  destructive?: boolean;
  onRespond: (approved: boolean) => void;
}) {
  return (
    <div className="flex gap-2 border-t p-2">
      <Button
        type="button"
        variant="ghost"
        className="flex-1"
        onClick={() => onRespond(false)}
      >
        Descartar
      </Button>
      <Button
        type="button"
        variant={destructive ? "destructive" : "default"}
        className="flex-1"
        onClick={() => onRespond(true)}
      >
        {confirmLabel}
      </Button>
    </div>
  );
}

function PendingFooter({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground flex items-center gap-2 border-t px-3 py-2.5 text-sm">
      <Loader2 className="size-3.5 animate-spin" />
      {label}
    </p>
  );
}

function DeniedFooter({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground border-t px-3 py-2.5 text-sm">
      {label}
    </p>
  );
}

function DoneFooter({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 border-t px-3 py-2.5 text-sm text-emerald-600 dark:text-emerald-400">
      <Check className="size-3.5" />
      {label}
    </p>
  );
}

type ChatToolPartProps = {
  part: ChatMessagePart;
  onRespondToApproval: (approvalId: string, approved: boolean) => void;
};

/**
 * Traduce cada estado de una tool a algo que el usuario entienda: qué se está
 * consultando, qué se va a hacer y qué quedó hecho.
 */
export function ChatToolPart({ part, onRespondToApproval }: ChatToolPartProps) {
  switch (part.type) {
    /* ---------------------------------------------------------- consultas */
    case "tool-listCategories": {
      if (part.state === "output-error") {
        return <ToolError message="No pude leer tus categorías." />;
      }
      if (part.state !== "output-available") {
        return (
          <ToolStatus icon={Tags} label="Revisando tus categorías…" pending />
        );
      }
      return (
        <ToolStatus
          icon={Tags}
          label={`Revisé tus ${part.output.categories.length} categorías`}
        />
      );
    }

    case "tool-getPeriodSummary": {
      if (part.state === "output-error") {
        return <ToolError message="No pude calcular el resumen del periodo." />;
      }
      if (part.state !== "output-available") {
        return (
          <ToolStatus
            icon={PieChart}
            label="Sacando cuentas del periodo…"
            pending
          />
        );
      }
      if (!part.output.ok) {
        return <ToolError message={part.output.error} />;
      }
      return <PeriodSummaryCard summary={part.output} />;
    }

    case "tool-listExpenses": {
      if (part.state === "output-error") {
        return <ToolError message="No pude buscar los gastos." />;
      }
      if (part.state !== "output-available") {
        return (
          <ToolStatus icon={Search} label="Buscando en tus gastos…" pending />
        );
      }
      if (part.output.expenses.length === 0) {
        return (
          <ToolStatus icon={Search} label="No encontré gastos que coincidan" />
        );
      }
      return <ExpenseListCard output={part.output} />;
    }

    /* ---------------------------------------------------------- registrar */
    case "tool-createExpense": {
      if (part.state === "input-streaming") {
        return <ToolStatus icon={Plus} label="Preparando el gasto…" pending />;
      }
      if (part.state === "output-error") {
        return <ToolError message="No se pudo registrar el gasto." />;
      }

      const preview: ExpensePreview | null =
        part.state === "output-available" && part.output.ok
          ? part.output.expense
          : "input" in part && part.input
            ? {
                amount: part.input.amount,
                description: part.input.description,
                date: part.input.date,
                image: part.input.image,
              }
            : null;

      if (!preview) return null;

      return (
        <ActionCard
          icon={Plus}
          title="Nuevo gasto"
          tone={
            part.state === "output-available" && part.output.ok
              ? "success"
              : part.state === "output-denied"
                ? "muted"
                : "default"
          }
          footer={
            part.state === "approval-requested" &&
            !part.approval.isAutomatic ? (
              <ConfirmFooter
                confirmLabel="Registrar"
                onRespond={(approved) =>
                  onRespondToApproval(part.approval.id, approved)
                }
              />
            ) : part.state === "output-denied" ? (
              <DeniedFooter label="No se registró." />
            ) : part.state === "output-available" ? (
              part.output.ok ? (
                <DoneFooter label="Registrado en tus gastos." />
              ) : (
                <DeniedFooter label={part.output.error} />
              )
            ) : (
              <PendingFooter label="Registrando…" />
            )
          }
        >
          <ExpenseSummary expense={preview} />
        </ActionCard>
      );
    }

    /* ------------------------------------------------------------- editar */
    case "tool-updateExpense": {
      if (part.state === "input-streaming") {
        return (
          <ToolStatus icon={PencilLine} label="Preparando el cambio…" pending />
        );
      }
      if (part.state === "output-error") {
        return <ToolError message="No se pudo actualizar el gasto." />;
      }

      return (
        <ActionCard
          icon={PencilLine}
          title="Editar gasto"
          tone={
            part.state === "output-available" && part.output.ok
              ? "success"
              : part.state === "output-denied"
                ? "muted"
                : "default"
          }
          footer={
            part.state === "approval-requested" &&
            !part.approval.isAutomatic ? (
              <ConfirmFooter
                confirmLabel="Guardar cambios"
                onRespond={(approved) =>
                  onRespondToApproval(part.approval.id, approved)
                }
              />
            ) : part.state === "output-denied" ? (
              <DeniedFooter label="No se cambió nada." />
            ) : part.state === "output-available" ? (
              part.output.ok ? (
                <DoneFooter label="Gasto actualizado." />
              ) : (
                <DeniedFooter label={part.output.error} />
              )
            ) : (
              <PendingFooter label="Guardando…" />
            )
          }
        >
          {part.state === "output-available" && part.output.ok ? (
            <ExpenseSummary expense={part.output.expense} />
          ) : (
            <ul className="space-y-1 p-3 text-sm">
              {part.input.amount !== undefined ? (
                <ChangeRow label="Monto" value={part.input.amount} isAmount />
              ) : null}
              {part.input.date ? (
                <ChangeRow
                  label="Fecha"
                  value={formatExpenseDate(parseToolDate(part.input.date))}
                />
              ) : null}
              {part.input.description !== undefined ? (
                <ChangeRow
                  label="Descripción"
                  value={part.input.description ?? "(sin descripción)"}
                />
              ) : null}
              {part.input.categoryId ? (
                <ChangeRow label="Categoría" value="cambia de categoría" />
              ) : null}
            </ul>
          )}
        </ActionCard>
      );
    }

    /* ------------------------------------------------------------- borrar */
    case "tool-deleteExpense": {
      if (part.state === "input-streaming") {
        return null;
      }
      if (part.state === "output-error") {
        return <ToolError message="No se pudo eliminar el gasto." />;
      }

      return (
        <ActionCard
          icon={Trash2}
          title="Eliminar gasto"
          tone={part.state === "output-denied" ? "muted" : "destructive"}
          footer={
            part.state === "approval-requested" &&
            !part.approval.isAutomatic ? (
              <ConfirmFooter
                confirmLabel="Eliminar"
                destructive
                onRespond={(approved) =>
                  onRespondToApproval(part.approval.id, approved)
                }
              />
            ) : part.state === "output-denied" ? (
              <DeniedFooter label="No se eliminó nada." />
            ) : part.state === "output-available" ? (
              part.output.ok ? (
                <DoneFooter label="Eliminado de forma permanente." />
              ) : (
                <DeniedFooter label={part.output.error} />
              )
            ) : (
              <PendingFooter label="Eliminando…" />
            )
          }
        >
          <p className="p-3 text-sm">
            Se va a eliminar <strong>{part.input.label}</strong> de forma
            permanente. Esta acción no se puede deshacer.
          </p>
        </ActionCard>
      );
    }

    /* ----------------------------------------------------------- ingresos */
    case "tool-listIncomes": {
      if (part.state === "output-error") {
        return <ToolError message="No pude buscar los ingresos." />;
      }
      if (part.state !== "output-available") {
        return (
          <ToolStatus icon={Search} label="Buscando en tus ingresos…" pending />
        );
      }
      if (part.output.incomes.length === 0) {
        return (
          <ToolStatus
            icon={Search}
            label="No encontré ingresos que coincidan"
          />
        );
      }
      return <IncomeListCard output={part.output} />;
    }

    case "tool-createIncome": {
      if (part.state === "input-streaming") {
        return (
          <ToolStatus icon={Banknote} label="Preparando el ingreso…" pending />
        );
      }
      if (part.state === "output-error") {
        return <ToolError message="No se pudo registrar el ingreso." />;
      }

      const preview: IncomePreview | null =
        part.state === "output-available" && part.output.ok
          ? part.output.income
          : "input" in part && part.input
            ? {
                amount: part.input.amount,
                iva: part.input.iva,
                isr: part.input.isr,
                description: part.input.description,
                date: part.input.date,
              }
            : null;

      if (!preview) return null;

      return (
        <ActionCard
          icon={Banknote}
          title="Nuevo ingreso"
          tone={
            part.state === "output-available" && part.output.ok
              ? "success"
              : part.state === "output-denied"
                ? "muted"
                : "default"
          }
          footer={
            part.state === "approval-requested" &&
            !part.approval.isAutomatic ? (
              <ConfirmFooter
                confirmLabel="Registrar"
                onRespond={(approved) =>
                  onRespondToApproval(part.approval.id, approved)
                }
              />
            ) : part.state === "output-denied" ? (
              <DeniedFooter label="No se registró." />
            ) : part.state === "output-available" ? (
              part.output.ok ? (
                <DoneFooter label="Registrado en tus ingresos." />
              ) : (
                <DeniedFooter label={part.output.error} />
              )
            ) : (
              <PendingFooter label="Registrando…" />
            )
          }
        >
          <IncomeSummary income={preview} />
        </ActionCard>
      );
    }

    case "tool-updateIncome": {
      if (part.state === "input-streaming") {
        return (
          <ToolStatus icon={PencilLine} label="Preparando el cambio…" pending />
        );
      }
      if (part.state === "output-error") {
        return <ToolError message="No se pudo actualizar el ingreso." />;
      }

      return (
        <ActionCard
          icon={PencilLine}
          title="Editar ingreso"
          tone={
            part.state === "output-available" && part.output.ok
              ? "success"
              : part.state === "output-denied"
                ? "muted"
                : "default"
          }
          footer={
            part.state === "approval-requested" &&
            !part.approval.isAutomatic ? (
              <ConfirmFooter
                confirmLabel="Guardar cambios"
                onRespond={(approved) =>
                  onRespondToApproval(part.approval.id, approved)
                }
              />
            ) : part.state === "output-denied" ? (
              <DeniedFooter label="No se cambió nada." />
            ) : part.state === "output-available" ? (
              part.output.ok ? (
                <DoneFooter label="Ingreso actualizado." />
              ) : (
                <DeniedFooter label={part.output.error} />
              )
            ) : (
              <PendingFooter label="Guardando…" />
            )
          }
        >
          {part.state === "output-available" && part.output.ok ? (
            <IncomeSummary income={part.output.income} />
          ) : (
            <ul className="space-y-1 p-3 text-sm">
              {part.input.amount !== undefined ? (
                <ChangeRow label="Cobrado" value={part.input.amount} isAmount />
              ) : null}
              {part.input.iva !== undefined ? (
                <ChangeRow
                  label="IVA"
                  value={part.input.iva ?? "(sin IVA)"}
                  isAmount={part.input.iva !== null}
                />
              ) : null}
              {part.input.isr !== undefined ? (
                <ChangeRow
                  label="ISR retenido"
                  value={part.input.isr ?? "(sin retención)"}
                  isAmount={part.input.isr !== null}
                />
              ) : null}
              {part.input.date ? (
                <ChangeRow
                  label="Fecha"
                  value={formatExpenseDate(parseToolDate(part.input.date))}
                />
              ) : null}
              {part.input.description !== undefined ? (
                <ChangeRow
                  label="Concepto"
                  value={part.input.description ?? "(sin concepto)"}
                />
              ) : null}
            </ul>
          )}
        </ActionCard>
      );
    }

    case "tool-deleteIncome": {
      if (part.state === "input-streaming") {
        return null;
      }
      if (part.state === "output-error") {
        return <ToolError message="No se pudo eliminar el ingreso." />;
      }

      return (
        <ActionCard
          icon={Trash2}
          title="Eliminar ingreso"
          tone={part.state === "output-denied" ? "muted" : "destructive"}
          footer={
            part.state === "approval-requested" &&
            !part.approval.isAutomatic ? (
              <ConfirmFooter
                confirmLabel="Eliminar"
                destructive
                onRespond={(approved) =>
                  onRespondToApproval(part.approval.id, approved)
                }
              />
            ) : part.state === "output-denied" ? (
              <DeniedFooter label="No se eliminó nada." />
            ) : part.state === "output-available" ? (
              part.output.ok ? (
                <DoneFooter label="Eliminado de forma permanente." />
              ) : (
                <DeniedFooter label={part.output.error} />
              )
            ) : (
              <PendingFooter label="Eliminando…" />
            )
          }
        >
          <p className="p-3 text-sm">
            Se va a eliminar <strong>{part.input.label}</strong> de forma
            permanente. Esta acción no se puede deshacer.
          </p>
        </ActionCard>
      );
    }

    /* --------------------------------------------------------- categorías */
    case "tool-createCategory": {
      if (part.state === "input-streaming") {
        return (
          <ToolStatus
            icon={FolderPlus}
            label="Preparando la categoría…"
            pending
          />
        );
      }
      if (part.state === "output-error") {
        return <ToolError message="No se pudo crear la categoría." />;
      }

      return (
        <ActionCard
          icon={FolderPlus}
          title="Nueva categoría"
          tone={
            part.state === "output-available" && part.output.ok
              ? "success"
              : part.state === "output-denied"
                ? "muted"
                : "default"
          }
          footer={
            part.state === "approval-requested" &&
            !part.approval.isAutomatic ? (
              <ConfirmFooter
                confirmLabel="Crear categoría"
                onRespond={(approved) =>
                  onRespondToApproval(part.approval.id, approved)
                }
              />
            ) : part.state === "output-denied" ? (
              <DeniedFooter label="No se creó." />
            ) : part.state === "output-available" ? (
              part.output.ok ? (
                <DoneFooter label="Categoría creada." />
              ) : (
                <DeniedFooter label={part.output.error} />
              )
            ) : (
              <PendingFooter label="Creando…" />
            )
          }
        >
          <div className="flex items-center gap-3 p-3">
            <CategoryIcon icon={part.input.icon} color={part.input.color} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{part.input.name}</p>
              <p className="text-muted-foreground text-xs">
                {part.input.budget
                  ? `Presupuesto mensual asignado`
                  : "Sin presupuesto asignado"}
              </p>
            </div>
            {part.input.budget ? (
              <BudgetAmount value={part.input.budget} />
            ) : null}
          </div>
        </ActionCard>
      );
    }

    default:
      return null;
  }
}

function BudgetAmount({ value }: { value: number }) {
  const { formatAmount } = useAppSettings();
  return (
    <p className="shrink-0 font-semibold tabular-nums">{formatAmount(value)}</p>
  );
}

function ChangeRow({
  label,
  value,
  isAmount = false,
}: {
  label: string;
  value: string | number;
  isAmount?: boolean;
}) {
  const { formatAmount } = useAppSettings();

  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", isAmount && "tabular-nums")}>
        {isAmount && typeof value === "number" ? formatAmount(value) : value}
      </span>
    </li>
  );
}

function PeriodSummaryCard({
  summary,
}: {
  summary: {
    totalSpent: number;
    expenseCount: number;
    income: { net: number; iva: number; isr: number; count: number };
    balance: number;
    byCategory: {
      categoryId: string;
      name: string;
      icon: string;
      color: string;
      total: number;
    }[];
  };
}) {
  const { formatAmount } = useAppSettings();
  const top = summary.byCategory.slice(0, 5);
  const max = top[0]?.total ?? 0;
  const hasIncome = summary.income.count > 0;

  return (
    <ActionCard icon={PieChart} title="Resumen del periodo">
      <div className="p-3">
        <p className="text-2xl font-semibold tabular-nums">
          {formatAmount(summary.totalSpent)}
        </p>
        <p className="text-muted-foreground text-xs">
          {summary.expenseCount === 1
            ? "1 gasto registrado"
            : `${summary.expenseCount} gastos registrados`}
        </p>

        {/* El balance sólo aparece si hay algo que balancear: sin ingresos
            capturados sería el gasto en negativo, que no dice nada. */}
        {hasIncome ? (
          <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
            <ChangeRow
              label="Cobrado neto"
              value={summary.income.net}
              isAmount
            />
            {summary.income.iva > 0 ? (
              <ChangeRow
                label="IVA trasladado"
                value={summary.income.iva}
                isAmount
              />
            ) : null}
            {summary.income.isr > 0 ? (
              <ChangeRow
                label="ISR retenido"
                value={summary.income.isr}
                isAmount
              />
            ) : null}
            <ChangeRow label="Balance" value={summary.balance} isAmount />
          </ul>
        ) : null}

        {top.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {top.map((category) => (
              <li key={category.categoryId} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">
                    <span aria-hidden className="mr-1.5">
                      {category.icon}
                    </span>
                    {category.name}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatAmount(category.total)}
                  </span>
                </div>
                {/* Barra decorativa: el dato ya está en el texto de al lado. */}
                <div
                  aria-hidden
                  className="bg-muted h-1.5 overflow-hidden rounded-full"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${max > 0 ? (category.total / max) * 100 : 0}%`,
                      backgroundColor: category.color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </ActionCard>
  );
}

function ExpenseListCard({
  output,
}: {
  output: {
    total: number;
    expenses: {
      id: string;
      amount: number;
      description: string | null;
      date: string;
      category: { name: string; icon: string; color: string };
    }[];
  };
}) {
  const { formatAmount } = useAppSettings();

  return (
    <ActionCard
      icon={Search}
      title={
        output.total === 1
          ? "1 gasto encontrado"
          : `${output.total} gastos encontrados`
      }
      footer={
        output.total > output.expenses.length ? (
          <p className="text-muted-foreground border-t px-3 py-2 text-xs">
            Se muestran los primeros {output.expenses.length}.
          </p>
        ) : undefined
      }
    >
      <ul className="divide-y">
        {output.expenses.map((expense) => (
          <li key={expense.id} className="flex items-center gap-3 px-3 py-2.5">
            <CategoryIcon
              icon={expense.category.icon}
              color={expense.category.color}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {expense.description?.trim() ?? expense.category.name}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {formatExpenseDate(parseToolDate(expense.date))}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums">
              {formatAmount(expense.amount)}
            </p>
          </li>
        ))}
      </ul>
    </ActionCard>
  );
}

function IncomeListCard({
  output,
}: {
  output: {
    total: number;
    incomes: {
      id: string;
      amount: number;
      iva: number | null;
      isr: number | null;
      net: number;
      description: string | null;
      date: string;
    }[];
  };
}) {
  const { formatAmount } = useAppSettings();

  return (
    <ActionCard
      icon={Search}
      title={
        output.total === 1
          ? "1 ingreso encontrado"
          : `${output.total} ingresos encontrados`
      }
      footer={
        output.total > output.incomes.length ? (
          <p className="text-muted-foreground border-t px-3 py-2 text-xs">
            Se muestran los primeros {output.incomes.length}.
          </p>
        ) : undefined
      }
    >
      <ul className="divide-y">
        {output.incomes.map((income) => (
          <li key={income.id} className="px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-medium">
                {formatIncomeTitle(income)}
              </p>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {formatAmount(income.net)}
              </p>
            </div>
            <p className="text-muted-foreground truncate text-xs">
              {formatExpenseDate(parseToolDate(income.date))}
              {income.iva !== null ? ` · IVA ${formatAmount(income.iva)}` : ""}
              {income.isr !== null ? ` · ISR ${formatAmount(income.isr)}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </ActionCard>
  );
}
