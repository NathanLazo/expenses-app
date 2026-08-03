/** Lado mayor máximo: un ticket sigue siendo legible a 1600px. */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

export const ACCEPTED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

function loadBitmap(file: File) {
  // createImageBitmap respeta la orientación EXIF y no depende del DOM.
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }
  return null;
}

/**
 * Reescala la foto del ticket y la reencoda a JPEG antes de subirla.
 *
 * Las cámaras de móvil entregan archivos de varios megas que no aportan nada
 * para leer un ticket: comprimir en el cliente hace la subida mucho más rápida
 * con 4G y reduce lo que guardamos en Blob. Si el navegador no puede procesar
 * el formato (p.ej. HEIC en algunos Android) devolvemos el archivo original.
 */
export async function compressReceiptImage(file: File): Promise<File> {
  try {
    const bitmapPromise = loadBitmap(file);
    if (!bitmapPromise) return file;

    const bitmap = await bitmapPromise;
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    // Ya es pequeña y ligera: no vale la pena reencodar (perderíamos calidad).
    if (scale === 1 && file.size <= 1024 * 1024 && file.type === "image/jpeg") {
      bitmap.close();
      return file;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );

    if (!blob || blob.size >= file.size) return file;

    return new File([blob], "ticket.jpg", {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
