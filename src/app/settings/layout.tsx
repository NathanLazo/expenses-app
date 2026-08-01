import type { Metadata } from "next";

import { buildRouteMetadata } from "~/lib/seo";

export const metadata: Metadata = buildRouteMetadata({
  title: "Configuración",
  description:
    "Personaliza tu experiencia de gestión de gastos: tema, preferencias y opciones de la cuenta.",
  path: "/settings",
});

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
