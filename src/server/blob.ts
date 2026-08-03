import "server-only";

import { del } from "@vercel/blob";

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/**
 * Borra el ticket de Vercel Blob cuando se reemplaza o se elimina el gasto.
 *
 * Es una operación best-effort: si falla, el gasto igual queda actualizado en
 * la base y sólo dejamos un archivo huérfano, algo mucho menos grave que
 * romperle la acción al usuario.
 */
export async function deleteReceipt(url: string | null | undefined) {
  if (!url) return;

  try {
    // No mandamos a borrar URLs ajenas al store (datos viejos o manipulados).
    if (!new URL(url).hostname.endsWith(BLOB_HOST_SUFFIX)) return;
    await del(url);
  } catch (error) {
    console.error("[blob] no se pudo borrar el ticket", url, error);
  }
}
