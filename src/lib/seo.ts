import type { Metadata } from "next";

export const siteConfig = {
  name: "Zen Expenses",
  description:
    "Zen Expenses es una app para registrar gastos, organizarlos por categorías y analizar en qué se va tu dinero cada mes.",
  locale: "es_MX",
} as const;

/**
 * Base absoluta usada por Next.js para resolver URLs relativas (canonical, og:image, etc).
 * Se toma de NEXT_PUBLIC_SITE_URL y, si no existe, de la URL que expone Vercel.
 */
export const siteUrl = (() => {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);

  return fromEnv ?? "http://localhost:3000";
})();

type RouteMetadataInput = {
  /** Título de la ruta. Se muestra como "Zen Expenses - {title}". */
  title: string;
  description: string;
  /** Ruta absoluta del sitio, por ejemplo "/reports". */
  path: string;
};

/**
 * Construye la metadata de una ruta manteniendo el formato "Zen Expenses - {ruta}"
 * junto con canonical, Open Graph y Twitter Card consistentes en todo el sitio.
 */
export function buildRouteMetadata({
  title,
  description,
  path,
}: RouteMetadataInput): Metadata {
  const fullTitle = `${siteConfig.name} - ${title}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      title: fullTitle,
      description,
      url: path,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}
