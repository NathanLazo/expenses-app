import type { Metadata } from "next";

import { buildRouteMetadata } from "~/lib/seo";

export const metadata: Metadata = buildRouteMetadata({
  title: "Gastos",
  description:
    "Consulta, filtra y edita todas tus transacciones del periodo, y registra nuevos gastos.",
  path: "/expenses",
});

export default function ExpensesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
