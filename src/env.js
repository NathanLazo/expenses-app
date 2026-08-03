import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    /**
     * Token del store de Vercel Blob donde se guardan las fotos de los tickets.
     * Vercel lo inyecta al vincular el store; en local se obtiene con
     * `vercel env pull .env`.
     *
     * Es opcional a propósito: adjuntar el ticket es opcional, así que sin
     * store la app sigue funcionando y sólo falla la subida (con un mensaje
     * claro) en vez de impedir que arranque.
     */
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
    /**
     * Key del AI Gateway de Vercel, que es por donde el chat habla con el
     * modelo. En un deploy de Vercel no hace falta (el proyecto se autentica
     * con OIDC); en local se obtiene con `vercel env pull .env` o creando una
     * key en el dashboard.
     *
     * Opcional a propósito, igual que el token de Blob: sin ella la app
     * arranca y sólo falla la ruta del chat.
     */
    AI_GATEWAY_API_KEY: z.string().min(1).optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
