"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CategoryIcon } from "~/components/common/category-icon";
import { Button } from "~/components/ui/button";
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
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

export const EMOJI_OPTIONS = [
  "💰",
  "🏠",
  "🚗",
  "🍔",
  "🛒",
  "🎮",
  "👕",
  "💊",
  "📚",
  "✈️",
  "🎬",
  "🐶",
];

export const COLOR_OPTIONS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ponle un nombre a la categoría")
    .max(40, "Máximo 40 caracteres"),
  description: z.string().trim().max(140, "Máximo 140 caracteres"),
  icon: z.string().min(1),
  color: z.string().min(1),
  budget: z
    .string()
    .refine((value) => value === "" || Number.parseFloat(value) >= 0, {
      message: "El presupuesto no puede ser negativo",
    }),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export type CategorySubmitValues = {
  name: string;
  description?: string;
  icon: string;
  color: string;
  budget?: number;
};

type CategoryFormProps = {
  defaultValues?: Partial<CategoryFormValues>;
  onSubmit: (values: CategorySubmitValues) => void;
  onCancel: () => void;
  isPending?: boolean;
  submitLabel?: string;
};

export function CategoryForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  submitLabel = "Guardar",
}: CategoryFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: EMOJI_OPTIONS[0]!,
      color: COLOR_OPTIONS[0]!,
      budget: "",
      ...defaultValues,
    },
  });

  const icon = form.watch("icon");
  const color = form.watch("color");
  const name = form.watch("name");

  const handleSubmit = form.handleSubmit((values) =>
    onSubmit({
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      icon: values.icon,
      color: values.color,
      budget: values.budget ? Number.parseFloat(values.budget) : undefined,
    }),
  );

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-3">
          <CategoryIcon icon={icon} color={color} />
          <div className="min-w-0">
            <p className="truncate font-medium">
              {name || "Vista previa de la categoría"}
            </p>
            <p className="text-muted-foreground text-xs">
              Así se verá en tus listas y gráficas
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ej: Comida, Transporte..."
                  autoFocus
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Descripción{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={2}
                  className="resize-none"
                  placeholder="¿Qué tipo de gastos entran aquí?"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icono</FormLabel>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => field.onChange(emoji)}
                    aria-label={`Icono ${emoji}`}
                    aria-pressed={field.value === emoji}
                    className={cn(
                      "hover:bg-accent flex size-10 items-center justify-center rounded-md border text-lg transition-colors",
                      field.value === emoji &&
                        "border-primary ring-primary/30 ring-2",
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => field.onChange(option)}
                    aria-label={`Color ${option}`}
                    aria-pressed={field.value === option}
                    className="flex size-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: option,
                      borderColor:
                        field.value === option ? option : "transparent",
                      boxShadow:
                        field.value === option
                          ? `0 0 0 2px var(--background), 0 0 0 4px ${option}`
                          : undefined,
                    }}
                  >
                    {field.value === option ? (
                      <Check className="size-4 text-white" />
                    ) : null}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="budget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Presupuesto mensual{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="tabular-nums"
                />
              </FormControl>
              <FormDescription>
                Si lo defines, verás una barra de avance en la tarjeta de la
                categoría.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
