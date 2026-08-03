"use client";

import Image from "next/image";
import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import { CategoryIcon } from "~/components/common/category-icon";
import { useExpenseDialog } from "~/components/expenses/expense-dialog-provider";
import { ReceiptViewer } from "~/components/expenses/receipt-viewer";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Skeleton } from "~/components/ui/skeleton";
import { useAppSettings } from "~/hooks/use-app-settings";
import type { ExpenseWithCategory } from "~/lib/api-types";
import { formatExpenseDate } from "~/lib/format";

/** Agrupa los gastos por día conservando el orden descendente del servidor. */
function groupByDay(expenses: ExpenseWithCategory[]) {
  const groups = new Map<string, ExpenseWithCategory[]>();

  for (const expense of expenses) {
    const key = new Date(expense.date).toDateString();
    const bucket = groups.get(key);
    if (bucket) bucket.push(expense);
    else groups.set(key, [expense]);
  }

  return [...groups.entries()];
}

export function ExpenseListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-lg border p-3"
        >
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ExpenseRow({ expense }: { expense: ExpenseWithCategory }) {
  const { formatAmount } = useAppSettings();
  const { openEdit, requestDelete } = useExpenseDialog();
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  return (
    <li className="hover:bg-accent/50 flex items-center gap-3 rounded-lg border p-3 transition-colors">
      <CategoryIcon
        icon={expense.category.icon}
        color={expense.category.color}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{expense.description}</p>
        <p className="text-muted-foreground truncate text-sm">
          {expense.category.name}
        </p>
      </div>

      {expense.image ? (
        <button
          type="button"
          onClick={() => setIsReceiptOpen(true)}
          aria-label={`Ver ticket de ${expense.description}`}
          className="focus-visible:ring-ring relative size-9 shrink-0 overflow-hidden rounded-md border transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
        >
          <Image
            src={expense.image}
            alt=""
            fill
            sizes="36px"
            className="object-cover"
          />
        </button>
      ) : null}

      <span className="shrink-0 font-semibold tabular-nums">
        {formatAmount(expense.amount)}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={`Acciones para ${expense.description}`}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(expense)}>
            <Pencil className="mr-2 size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => requestDelete(expense)}
          >
            <Trash2 className="mr-2 size-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReceiptViewer
        url={isReceiptOpen ? expense.image : null}
        onClose={() => setIsReceiptOpen(false)}
        title={expense.description}
      />
    </li>
  );
}

export function ExpenseList({ expenses }: { expenses: ExpenseWithCategory[] }) {
  const { formatAmount } = useAppSettings();
  const groups = groupByDay(expenses);

  return (
    <div className="space-y-6">
      {groups.map(([day, dayExpenses]) => {
        const dayTotal = dayExpenses.reduce(
          (sum, expense) => sum + expense.amount,
          0,
        );

        return (
          <section key={day} className="space-y-2">
            <header className="flex items-baseline justify-between gap-2 px-1">
              <h3 className="text-sm font-medium">
                {formatExpenseDate(new Date(day))}
              </h3>
              <span className="text-muted-foreground text-xs tabular-nums">
                {formatAmount(dayTotal)}
              </span>
            </header>
            <ul className="space-y-2">
              {dayExpenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
