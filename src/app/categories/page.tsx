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
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import type { Category } from "@prisma/client";

const EMOJI_OPTIONS = [
  "💰",
  "🏠",
  "🚗",
  "🍔",
  "🎮",
  "👕",
  "💊",
  "📚",
  "✈️",
  "🎬",
];
const COLOR_OPTIONS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

export default function CategoriesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
    icon: "💰",
    budget: "",
  });

  const utils = api.useUtils();

  const { data: categories, isLoading } = api.useCategories.getAll.useQuery();
  const createCategory = api.useCategories.create.useMutation({
    onSuccess: async () => {
      await utils.useCategories.getAll.invalidate();
      setIsCreateOpen(false);
      resetForm();
      toast.success("Categoría creada", {
        description: "La categoría se ha creado exitosamente.",
      });
    },
  });
  const updateCategory = api.useCategories.update.useMutation({
    onSuccess: async () => {
      await utils.useCategories.getAll.invalidate();
      setEditingCategory(null);
      resetForm();
      toast.success("Categoría actualizada", {
        description: "La categoría se ha actualizado exitosamente.",
      });
    },
  });
  const deleteCategory = api.useCategories.delete.useMutation({
    onSuccess: async () => {
      await utils.useCategories.getAll.invalidate();
      toast.success("Categoría eliminada", {
        description: "La categoría se ha eliminado exitosamente.",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#3B82F6",
      icon: "💰",
      budget: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      description: formData.description || undefined,
      color: formData.color,
      icon: formData.icon,
      budget: formData.budget ? Number.parseFloat(formData.budget) : undefined,
    };

    if (editingCategory) {
      updateCategory.mutate({ id: editingCategory?.id ?? "", ...data });
    } else {
      createCategory.mutate(data);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description ?? "",
      color: category.color,
      icon: category.icon,
      budget: category.budget?.toString() ?? "",
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta categoría?")) {
      deleteCategory.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="border-primary h-32 w-32 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Categorías</h2>
          <p className="text-muted-foreground">
            Gestiona las categorías de tus gastos
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Nueva Categoría</DialogTitle>
              <DialogDescription>
                Crea una nueva categoría para organizar tus gastos.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ej: Comida, Transporte..."
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Descripción opcional..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Icono</Label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <Button
                        key={emoji}
                        type="button"
                        variant={
                          formData.icon === emoji ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setFormData({ ...formData, icon: emoji })
                        }
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <Button
                        key={color}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        style={{
                          backgroundColor:
                            formData.color === color ? color : "transparent",
                        }}
                        onClick={() => setFormData({ ...formData, color })}
                      >
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="budget">Presupuesto Mensual (Opcional)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    value={formData.budget}
                    onChange={(e) =>
                      setFormData({ ...formData, budget: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createCategory.isPending}>
                  {createCategory.isPending ? "Creando..." : "Crear Categoría"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories?.result?.map((category) => {
          const totalSpent = category.expenses.reduce(
            (sum, expense) => sum + expense.amount,
            0,
          );
          const budgetPercentage = category.budget
            ? (totalSpent / category.budget) * 100
            : 0;

          return (
            <Card key={category.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-2">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {category._count.expenses} gastos
                    </CardDescription>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      Gastado este mes:
                    </span>
                    <span className="font-medium">
                      ${totalSpent.toFixed(2)}
                    </span>
                  </div>
                  {category.budget && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                          Presupuesto:
                        </span>
                        <span className="font-medium">
                          ${category.budget.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(budgetPercentage, 100)}%`,
                            backgroundColor:
                              budgetPercentage > 100
                                ? "#ef4444"
                                : category.color,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">
                          {budgetPercentage.toFixed(1)}% usado
                        </span>
                        {budgetPercentage > 100 && (
                          <Badge variant="destructive" className="text-xs">
                            Excedido
                          </Badge>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog para editar */}
      <Dialog
        open={!!editingCategory}
        onOpenChange={() => setEditingCategory(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la categoría.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nombre</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Icono</Label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      type="button"
                      variant={formData.icon === emoji ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <Button
                      key={color}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      style={{
                        backgroundColor:
                          formData.color === color ? color : "transparent",
                      }}
                      onClick={() => setFormData({ ...formData, color })}
                    >
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-budget">Presupuesto Mensual</Label>
                <Input
                  id="edit-budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) =>
                    setFormData({ ...formData, budget: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateCategory.isPending}>
                {updateCategory.isPending ? "Actualizando..." : "Actualizar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
