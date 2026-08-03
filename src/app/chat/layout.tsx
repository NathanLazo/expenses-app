import type { Metadata } from "next";

import { buildRouteMetadata } from "~/lib/seo";

export const metadata: Metadata = buildRouteMetadata({
  title: "Chat",
  description:
    "Sube la foto de un ticket y registra el gasto sin llenar formularios: el asistente deduce el monto, el comercio y la categoría.",
  path: "/chat",
});

export default function ChatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
