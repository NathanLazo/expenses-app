import type { Metadata } from "next";

import { buildRouteMetadata } from "~/lib/seo";

export const metadata: Metadata = buildRouteMetadata({
  title: "Ingresos",
  description:
    "Registra cuánto cobraste en el periodo, con el IVA que trasladaste y el ISR que te retuvieron.",
  path: "/income",
});

export default function IncomeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
