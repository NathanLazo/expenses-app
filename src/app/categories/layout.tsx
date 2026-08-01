import type { Metadata } from "next";

import { buildRouteMetadata } from "~/lib/seo";

export const metadata: Metadata = buildRouteMetadata({
  title: "Categorías",
  description:
    "Crea, edita y organiza las categorías con las que clasificas tus gastos en Zen Expenses.",
  path: "/categories",
});

export default function CategoriesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
