"use client";

import { useState } from "react";
import { ArrowLeft, Check, Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import {
  COLOR_OPTIONS,
  contrastingInk,
} from "~/components/categories/category-form";
import { CategoryIcon } from "~/components/common/category-icon";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EmptyState } from "~/components/common/empty-state";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ResponsiveModal } from "~/components/ui/responsive-modal";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { useAppSettings } from "~/hooks/use-app-settings";
import type { ClientWithTotals } from "~/lib/api-types";
import { isOkResult } from "~/lib/api-types";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

/** Emojis de contraparte, no de categoría de gasto. */
const CLIENT_EMOJIS = ["💼", "🏢", "🧑‍💻", "🏬", "🌐", "📐", "🎬", "🛠️"];

type ClientManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ClientManager({ open, onOpenChange }: ClientManagerProps) {
  const { formatAmount } = useAppSettings();
  const utils = api.useUtils();

  const [editing, setEditing] = useState<ClientWithTotals | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ClientWithTotals | null>(
    null,
  );

  const [name, setName] = useState("");
  const [icon, setIcon] = useState(CLIENT_EMOJIS[0]!);
  const [color, setColor] = useState(COLOR_OPTIONS[0]!);
  const [notes, setNotes] = useState("");

  const { data, isLoading } = api.useClients.getAll.useQuery(undefined, {
    enabled: open,
  });
  const clients = data?.result ?? [];
  const hasError = data ? !isOkResult(data) : false;

  const invalidate = async () => {
    await Promise.all([
      utils.useClients.invalidate(),
      utils.useIncomes.invalidate(),
      utils.useAnalytics.invalidate(),
    ]);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
  };

  const openForm = (client: ClientWithTotals | null) => {
    setEditing(client);
    setName(client?.name ?? "");
    setIcon(client?.icon ?? CLIENT_EMOJIS[0]!);
    setColor(client?.color ?? COLOR_OPTIONS[0]!);
    setNotes(client?.notes ?? "");
    setIsFormOpen(true);
  };

  const createClient = api.useClients.create.useMutation({
    onSuccess: async (response) => {
      if (!isOkResult(response)) {
        toast.error("No se pudo crear el cliente");
        return;
      }
      await invalidate();
      closeForm();
      toast.success("Cliente creado");
    },
    onError: () => toast.error("No se pudo crear el cliente"),
  });

  const updateClient = api.useClients.update.useMutation({
    onSuccess: async (response) => {
      if (!isOkResult(response)) {
        toast.error("No se pudo actualizar el cliente");
        return;
      }
      await invalidate();
      closeForm();
      toast.success("Cliente actualizado");
    },
    onError: () => toast.error("No se pudo actualizar el cliente"),
  });

  const deleteClient = api.useClients.delete.useMutation({
    onSuccess: async (response) => {
      if (!isOkResult(response)) {
        toast.error("No se pudo eliminar el cliente");
        return;
      }
      await invalidate();
      const unlinked = response.result?.unlinkedIncomes ?? 0;
      setPendingDelete(null);
      toast.success("Cliente eliminado", {
        description: unlinked
          ? `${unlinked} ${unlinked === 1 ? "cobro quedó" : "cobros quedaron"} sin cliente.`
          : undefined,
      });
    },
    onError: () => toast.error("No se pudo eliminar el cliente"),
  });

  const isPending = createClient.isPending || updateClient.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const values = { name: trimmed, icon, color, notes: notes.trim() || null };
    if (editing) updateClient.mutate({ id: editing.id, ...values });
    else createClient.mutate(values);
  };

  return (
    <>
      <ResponsiveModal
        open={open}
        onOpenChange={(next) => {
          if (!next) closeForm();
          onOpenChange(next);
        }}
        title={
          isFormOpen
            ? editing
              ? "Editar cliente"
              : "Nuevo cliente"
            : "Tus clientes"
        }
        description={
          isFormOpen
            ? "El nombre es lo único obligatorio."
            : "Quién te paga. Se usa para agrupar tus cobros y ver de dónde viene el dinero."
        }
      >
        {isFormOpen ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-muted/50 flex items-center gap-3 rounded-lg border p-3">
              <CategoryIcon icon={icon} color={color} />
              <p className="truncate font-medium">
                {name.trim() || "Vista previa del cliente"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-name">Nombre</Label>
              <Input
                id="client-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej: Estudio Marea"
                maxLength={60}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Icono</Label>
              <div className="flex flex-wrap gap-2">
                {CLIENT_EMOJIS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setIcon(option)}
                    aria-label={`Icono ${option}`}
                    aria-pressed={icon === option}
                    className={cn(
                      "hover:bg-accent flex size-10 items-center justify-center rounded-md border text-lg transition-colors",
                      icon === option &&
                        "border-primary ring-primary/30 ring-2",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setColor(option)}
                    aria-label={`Color ${option}`}
                    aria-pressed={color === option}
                    className="flex size-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-105"
                    style={{
                      backgroundColor: option,
                      borderColor: color === option ? option : "transparent",
                      boxShadow:
                        color === option
                          ? `0 0 0 2px var(--background), 0 0 0 4px ${option}`
                          : undefined,
                    }}
                  >
                    {color === option ? (
                      <Check
                        className="size-4"
                        style={{ color: contrastingInk(option) }}
                      />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-notes">
                Notas{" "}
                <span className="text-muted-foreground font-normal">
                  (opcional)
                </span>
              </Label>
              <Textarea
                id="client-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                maxLength={200}
                className="resize-none"
                placeholder="Contacto, condiciones de pago…"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                disabled={isPending}
              >
                <ArrowLeft className="mr-1 size-4" />
                Volver
              </Button>
              <Button type="submit" disabled={isPending || !name.trim()}>
                {isPending ? "Guardando…" : editing ? "Guardar" : "Crear"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <Button onClick={() => openForm(null)} className="w-full">
              <Plus className="mr-1 size-4" />
              Nuevo cliente
            </Button>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : hasError ? (
              <EmptyState
                icon={Users}
                title="No pudimos cargar tus clientes"
                description="Hubo un problema al consultarlos. Vuelve a intentarlo."
                action={
                  <Button
                    variant="outline"
                    onClick={() => utils.useClients.getAll.invalidate()}
                  >
                    Reintentar
                  </Button>
                }
              />
            ) : clients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Todavía no tienes clientes"
                description="Crea uno para saber de dónde viene cada cobro."
              />
            ) : (
              <ul className="space-y-2">
                {clients.map((client) => (
                  <li
                    key={client.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <CategoryIcon icon={client.icon} color={client.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{client.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {client.periodCount === 0
                          ? "Sin cobros en el periodo"
                          : `${formatAmount(client.periodTotals.net)} en ${client.periodCount} ${client.periodCount === 1 ? "cobro" : "cobros"}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      aria-label={`Editar ${client.name}`}
                      onClick={() => openForm(client)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive shrink-0"
                      aria-label={`Eliminar ${client.name}`}
                      onClick={() => setPendingDelete(client)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </ResponsiveModal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(next) => !next && setPendingDelete(null)}
        title="¿Eliminar este cliente?"
        description={
          <>
            Se eliminará <strong>{pendingDelete?.name}</strong>. Sus{" "}
            <strong>{pendingDelete?._count.incomes ?? 0}</strong>{" "}
            {pendingDelete?._count.incomes === 1 ? "cobro" : "cobros"} se
            conservan y quedan sin cliente, así que no pierdes nada de tu
            historial.
          </>
        }
        confirmLabel="Eliminar"
        destructive
        isPending={deleteClient.isPending}
        onConfirm={() =>
          pendingDelete && deleteClient.mutate({ id: pendingDelete.id })
        }
      />
    </>
  );
}
