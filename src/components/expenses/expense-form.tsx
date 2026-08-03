"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CategoryIcon } from "~/components/common/category-icon";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { useAppSettings } from "~/hooks/use-app-settings";
import type { CategoryWithStats } from "~/lib/api-types";
import { formatLongDate } from "~/lib/format";
import { cn } from "~/lib/utils";
import { es } from "date-fns/locale";

const expenseFormSchema = z.object({
  amount: z
    .string()
    .min(1, "Ingresa un monto")
    .refine((value) => Number.parseFloat(value) > 0, {
      message: "El monto debe ser mayor a 0",
    }),
  description: z
    .string()
    .trim()
    .min(1, "Describe brevemente el gasto")
    .max(120, "Máximo 120 caracteres"),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  date: z.date(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export type ExpenseSubmitValues = {
  amount: number;
  description: string;
  categoryId: string;
  date: Date;
};

type ExpenseFormProps = {
  categories: CategoryWithStats[];
  defaultValues?: Partial<ExpenseFormValues>;
  onSubmit: (values: ExpenseSubmitValues) => void;
  onCancel: () => void;
  isPending?: boolean;
  submitLabel?: string;
};

export function ExpenseForm({
  categories,
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  submitLabel = "Guardar gasto",
}: ExpenseFormProps) {
  const { formatAmount } = useAppSettings();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: "",
      description: "",
      categoryId: "",
      date: new Date(),
      ...defaultValues,
    },
  });

  const selectedCategoryId = form.watch("categoryId");
  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );

  const handleSubmit = form.handleSubmit((values) =>
    onSubmit({
      amount: Number.parseFloat(values.amount),
      description: values.description.trim(),
      categoryId: values.categoryId,
      date: values.date,
    }),
  );

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    autoFocus
                    className="text-lg font-medium tabular-nums"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={3}
                  placeholder="Ej: Súper de la semana"
                  className="resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha</FormLabel>
              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {field.value
                          ? formatLongDate(field.value)
                          : "Selecciona una fecha"}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => date && field.onChange(date)}
                      disabled={(date) => date > new Date()}
                      locale={es}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => field.onChange(new Date())}
                >
                  Hoy
                </Button>
              </div>
              <FormDescription>
                No puedes registrar gastos con fecha futura.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedCategory ? (
          <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-3">
            <CategoryIcon
              icon={selectedCategory.icon}
              color={selectedCategory.color}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {selectedCategory.name}
              </p>
              <p className="text-muted-foreground text-xs">
                {selectedCategory.budget
                  ? `Presupuesto mensual: ${formatAmount(selectedCategory.budget)}`
                  : "Sin presupuesto asignado"}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
