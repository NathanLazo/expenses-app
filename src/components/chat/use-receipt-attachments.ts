"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useDiscardReceipt } from "~/components/expenses/receipt-field";
import {
  ACCEPTED_RECEIPT_TYPES,
  MAX_RECEIPT_BYTES,
  compressReceiptImage,
} from "~/lib/receipt-image";

export type ChatAttachment = {
  id: string;
  /** objectURL local: se ve al instante, sin esperar a que suba. */
  previewUrl: string;
  status: "uploading" | "ready" | "error";
  progress: number;
  /** URL que se manda al modelo. Null mientras sube o si falló. */
  url: string | null;
  mediaType: string;
  /**
   * True sólo cuando la foto quedó en Blob con una URL pública. Si el store no
   * está configurado seguimos adelante con un data URL: el modelo puede leer el
   * ticket, pero esa foto no se puede guardar en el gasto.
   */
  isPersisted: boolean;
};

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

/**
 * Prepara las fotos de tickets que se mandan en el chat: comprime, sube a Blob
 * y expone el progreso. Reutiliza exactamente la misma ruta de subida que el
 * formulario de gastos, así que una foto adjuntada aquí se puede guardar tal
 * cual en el gasto que cree el asistente.
 */
export function useReceiptAttachments() {
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const discardReceipt = useDiscardReceipt();

  // Los objectURL se revocan al desmontar; guardarlos en un ref evita que el
  // efecto dependa de la lista y los revoque en cada render.
  const previewUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  const update = useCallback(
    (id: string, patch: Partial<ChatAttachment>) => {
      setAttachments((current) =>
        current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        if (!ACCEPTED_RECEIPT_TYPES.includes(file.type)) {
          toast.error("Formato no admitido", {
            description: "Usa una foto JPG, PNG, WEBP o HEIC.",
          });
          continue;
        }

        const id = crypto.randomUUID();
        const previewUrl = URL.createObjectURL(file);
        previewUrls.current.add(previewUrl);

        setAttachments((current) => [
          ...current,
          {
            id,
            previewUrl,
            status: "uploading",
            progress: 0,
            url: null,
            mediaType: file.type,
            isPersisted: false,
          },
        ]);

        try {
          const optimized = await compressReceiptImage(file);

          if (optimized.size > MAX_RECEIPT_BYTES) {
            toast.error("La foto pesa demasiado", {
              description: "Intenta con una imagen de menor resolución.",
            });
            update(id, { status: "error", progress: 0 });
            continue;
          }

          try {
            const blob = await upload(`tickets/${optimized.name}`, optimized, {
              access: "public",
              handleUploadUrl: "/api/receipts/upload",
              contentType: optimized.type,
              onUploadProgress: ({ percentage }) =>
                update(id, { progress: percentage }),
            });

            update(id, {
              status: "ready",
              progress: 100,
              url: blob.url,
              mediaType: optimized.type,
              isPersisted: true,
            });
          } catch (uploadError) {
            // Sin store de Blob el chat sigue siendo útil: el modelo lee la foto
            // desde un data URL aunque después no la pueda adjuntar al gasto.
            console.error(uploadError);
            update(id, {
              status: "ready",
              progress: 100,
              url: await readAsDataUrl(optimized),
              mediaType: optimized.type,
              isPersisted: false,
            });
          }
        } catch (error) {
          console.error(error);
          update(id, { status: "error", progress: 0 });
          toast.error("No se pudo preparar la foto", {
            description: "Revisa tu conexión e inténtalo de nuevo.",
          });
        }
      }
    },
    [update],
  );

  const remove = useCallback(
    (id: string) => {
      setAttachments((current) => {
        const target = current.find((item) => item.id === id);

        if (target) {
          URL.revokeObjectURL(target.previewUrl);
          previewUrls.current.delete(target.previewUrl);
          // Si ya estaba en Blob y nadie la usó, se suelta para no dejar basura.
          if (target.isPersisted && target.url) discardReceipt(target.url);
        }

        return current.filter((item) => item.id !== id);
      });
    },
    [discardReceipt],
  );

  /** Se llama al enviar: las fotos ya viajan dentro del mensaje. */
  const clear = useCallback(() => {
    setAttachments((current) => {
      for (const item of current) {
        URL.revokeObjectURL(item.previewUrl);
        previewUrls.current.delete(item.previewUrl);
      }
      return [];
    });
  }, []);

  return {
    attachments,
    addFiles,
    remove,
    clear,
    isUploading: attachments.some((item) => item.status === "uploading"),
  };
}
