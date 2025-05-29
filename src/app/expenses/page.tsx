"use client";

import type React from "react";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function NewExpensePage() {
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    categoryId: "",
    date: new Date(),
  });

  const router = useRouter();

  const { data: categories, isLoading: categoriesLoading } =
    api.useCategories.getAll.useQuery();
  const createExpense = api.useExpenses.create.useMutation({
    onSuccess: () => {
      toast.success("Gasto agregado", {
        description: "El gasto se ha registrado exitosamente.",
      });
      router.push("/");
    },
    onError: (error) => {
      toast.error("Error al agregar gasto", {
        description: "Hubo un problema al agregar el gasto.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.description || !formData.categoryId) {
      toast.error("Campos requeridos", {
        description: "Por favor completa todos los campos obligatorios.",
      });
      return;
    }

    createExpense.mutate({
      amount: Number.parseFloat(formData.amount),
      description: formData.description,
      categoryId: formData.categoryId,
      date: formData.date,
    });
  };

  const selectedCategory = categories?.result?.find(
    (cat) => cat.id === formData.categoryId,
  );

  if (categoriesLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="border-primary h-32 w-32 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Agregar Nuevo Gasto</CardTitle>
            <CardDescription>
              Registra un nuevo gasto en tu presupuesto mensual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría">
                        {selectedCategory && (
                          <div className="flex items-center space-x-2">
                            <span>{selectedCategory.icon}</span>
                            <span>{selectedCategory.name}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.result?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center space-x-2">
                            <span>{category.icon}</span>
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe el gasto..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? (
                        format(formData.date, "PPP", { locale: es })
                      ) : (
                        <span>Selecciona una fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) =>
                        date && setFormData({ ...formData, date })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {selectedCategory && (
                <div className="bg-muted rounded-lg p-4">
                  <div className="mb-2 flex items-center space-x-2">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full text-sm text-white"
                      style={{ backgroundColor: selectedCategory.color }}
                    >
                      {selectedCategory.icon}
                    </div>
                    <span className="font-medium">{selectedCategory.name}</span>
                  </div>
                  {selectedCategory.budget && (
                    <div className="text-muted-foreground text-sm">
                      Presupuesto mensual: ${selectedCategory.budget.toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push("/")}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createExpense.isPending}
                >
                  {createExpense.isPending ? "Agregando..." : "Agregar Gasto"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {categories?.result && categories.result.length === 0 && (
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  No tienes categorías creadas. Crea una categoría primero para
                  poder agregar gastos.
                </p>
                <Button asChild>
                  <Link href="/categories">Crear Categoría</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
