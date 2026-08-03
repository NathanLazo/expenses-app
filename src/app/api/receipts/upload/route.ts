import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "~/env";

/** 8 MB: suficiente para una foto ya comprimida en el cliente. */
const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

/**
 * Emite los tokens para subir tickets *directamente* del navegador a Vercel
 * Blob. Al no pasar el archivo por la función serverless nos saltamos el límite
 * de 4.5 MB de body y la foto no consume tiempo de ejecución.
 *
 * La app no tiene sesión de usuario, así que la única protección es el tipo de
 * archivo y el tamaño máximo declarados aquí.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Falta BLOB_READ_WRITE_TOKEN: crea un store de Vercel Blob y vincúlalo al proyecto.",
      },
      { status: 501 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/heic",
          "image/heif",
        ],
        addRandomSuffix: true,
        maximumSizeInBytes: MAX_RECEIPT_BYTES,
      }),
      onUploadCompleted: async () => {
        // El gasto se guarda desde el cliente con la URL devuelta por `upload()`.
        // Este callback no corre en localhost (Blob no puede alcanzar el host),
        // por eso no dependemos de él para persistir nada.
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[receipts/upload]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
