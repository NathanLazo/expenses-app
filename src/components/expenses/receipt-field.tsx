"use client";

import { upload } from "@vercel/blob/client";
import { Camera, ImageUp, Loader2, Trash2, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import {
  ACCEPTED_RECEIPT_TYPES,
  MAX_RECEIPT_BYTES,
  compressReceiptImage,
} from "~/lib/receipt-image";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

/**
 * Suelta del store una foto que ya no se va a usar. El servidor ignora la
 * petición si algún gasto o ingreso sigue apuntando a esa URL, así que es
 * seguro llamarlo también al editar un movimiento existente.
 */
export function useDiscardReceipt() {
  const discardReceipt = api.useExpenses.discardReceipt.useMutation();

  return (url: string | null | undefined) => {
    if (!url) return;
    discardReceipt.mutate({ url });
  };
}

/**
 * El mismo campo sirve para el ticket de un gasto y para la factura de un
 * ingreso. Los textos van en una tabla cerrada y no armados por concatenación,
 * porque en español el artículo y la concordancia cambian con el sustantivo.
 */
const COPY = {
  ticket: {
    folder: "tickets",
    attached: "Ticket adjuntado",
    uploadError: "No se pudo subir el ticket",
    alt: "Foto del ticket",
    zoom: "Ver ticket completo",
    remove: "Quitar ticket",
  },
  factura: {
    folder: "facturas",
    attached: "Factura adjuntada",
    uploadError: "No se pudo subir la factura",
    alt: "Foto de la factura",
    zoom: "Ver factura completa",
    remove: "Quitar factura",
  },
} as const;

type ReceiptFieldProps = {
  /** URL de la imagen ya subida, o `null` si todavía no hay ninguna. */
  value: string | null;
  onChange: (url: string | null) => void;
  /** Informa al formulario para bloquear el submit mientras sube la foto. */
  onUploadingChange?: (uploading: boolean) => void;
  onPreview?: (url: string) => void;
  disabled?: boolean;
  /** Qué se está adjuntando; cambia los textos y la carpeta del store. */
  kind?: keyof typeof COPY;
};

export function ReceiptField({
  value,
  onChange,
  onUploadingChange,
  onPreview,
  disabled,
  kind = "ticket",
}: ReceiptFieldProps) {
  const copy = COPY[kind];
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [progress, setProgress] = useState<number | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(false);

  const discardReceipt = useDiscardReceipt();

  const isUploading = progress !== null;
  const isBusy = Boolean(disabled) || isUploading;

  useEffect(() => {
    // `capture` sólo existe donde el sistema puede abrir la cámara; es más
    // fiable que adivinar por el ancho de la ventana.
    setHasCamera("capture" in document.createElement("input"));
  }, []);

  // Revoca el objectURL del preview local para no filtrar memoria.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    if (!ACCEPTED_RECEIPT_TYPES.includes(file.type)) {
      toast.error("Formato no admitido", {
        description: "Usa una foto JPG, PNG, WEBP o HEIC.",
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    setProgress(0);
    onUploadingChange?.(true);

    try {
      const optimized = await compressReceiptImage(file);

      if (optimized.size > MAX_RECEIPT_BYTES) {
        toast.error("La foto pesa demasiado", {
          description: "Intenta con una imagen de menor resolución.",
        });
        return;
      }

      const blob = await upload(`${copy.folder}/${optimized.name}`, optimized, {
        access: "public",
        handleUploadUrl: "/api/receipts/upload",
        contentType: optimized.type,
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      });

      // Si esto era un reemplazo, la foto anterior ya no le sirve a nadie.
      const replaced = value;
      onChange(blob.url);
      discardReceipt(replaced);
      toast.success(copy.attached);
    } catch (error) {
      console.error(error);
      toast.error(copy.uploadError, {
        description: "Revisa tu conexión e inténtalo de nuevo.",
      });
    } finally {
      setProgress(null);
      onUploadingChange?.(false);
      setLocalPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      // Permite volver a elegir el mismo archivo tras un error.
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const shownImage = localPreview ?? value;

  return (
    <div className="space-y-3">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      {shownImage ? (
        <div className="relative overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shownImage}
            alt={copy.alt}
            className={cn(
              "max-h-56 w-full object-cover transition-opacity",
              isUploading && "opacity-50",
            )}
          />

          {isUploading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 p-4">
              <Loader2 className="size-5 animate-spin text-white" />
              <Progress value={progress ?? 0} className="h-1.5 w-40" />
              <span className="text-xs font-medium text-white tabular-nums">
                Subiendo {Math.round(progress ?? 0)}%
              </span>
            </div>
          ) : (
            <div className="absolute top-2 right-2 flex gap-1.5">
              {onPreview ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="size-8 shadow-sm"
                  aria-label={copy.zoom}
                  onClick={() => onPreview(shownImage)}
                >
                  <ZoomIn className="size-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="size-8 shadow-sm"
                aria-label={copy.remove}
                disabled={disabled}
                onClick={() => {
                  onChange(null);
                  discardReceipt(value);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {hasCamera ? (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={isBusy}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="mr-2 size-4" />
            {shownImage ? "Repetir foto" : "Tomar foto"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={isBusy}
          onClick={() => galleryInputRef.current?.click()}
        >
          <ImageUp className="mr-2 size-4" />
          {shownImage ? "Cambiar archivo" : "Subir imagen"}
        </Button>
      </div>
    </div>
  );
}
