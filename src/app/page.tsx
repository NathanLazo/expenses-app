import type { Metadata } from "next";

import Dashboard from "./_components/dashboard";
import { buildRouteMetadata } from "~/lib/seo";

export const metadata: Metadata = {
  ...buildRouteMetadata({
    title: "Inicio",
    description:
      "Resumen mensual de tus gastos: total gastado, número de transacciones y distribución por categoría.",
    path: "/",
  }),
  // La plantilla del layout raíz no aplica al segmento donde se define,
  // por eso el título de la portada se fija de forma absoluta.
  title: { absolute: "Zen Expenses - Inicio" },
};

export default function HomePage() {
  return <Dashboard />;
}
