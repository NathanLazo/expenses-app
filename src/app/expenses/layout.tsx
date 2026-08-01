import type { Metadata } from "next";

import { buildRouteMetadata } from "~/lib/seo";

export const metadata: Metadata = buildRouteMetadata({
  title: "Gastos",
  description:
    "Registra un nuevo gasto, adjunta su evidencia y consulta el historial de transacciones del mes.",
  path: "/expenses",
});

export default function ExpensesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
