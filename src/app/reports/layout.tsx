import type { Metadata } from "next";

import { buildRouteMetadata } from "~/lib/seo";

export const metadata: Metadata = buildRouteMetadata({
  title: "Reportes",
  description:
    "Análisis detallado de tus gastos: tendencias por mes, comparativas y distribución por categoría.",
  path: "/reports",
});

export default function ReportsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
