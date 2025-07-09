import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { BackButton } from "~/components/BackButton";
import Link from "next/link";
import { ChartBar, List, Plus, Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Gastos Daniela y Nathan",
  description: "Gastos Daniela y Nathan",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <div className="flex min-h-screen flex-col">
            <header className="border-border flex items-center gap-4 border-b p-6">
              <BackButton />
              <h1 className="ml-4 text-xl font-semibold">Gastos</h1>
              <Link href="/reports" className="flex items-center gap-2">
                <ChartBar className="h-4 w-4" />
                <p className="hidden md:block">Reportes</p>
              </Link>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <p className="hidden md:block">Configuración</p>
              </Link>
              <Link href="/categories" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <p className="hidden md:block">Categorías</p>
              </Link>
              <Link href="/expenses" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <p className="hidden md:block">Agregar Gasto</p>
              </Link>
            </header>
            <main className="flex-1 p-6">{children}</main>
            <footer className="border-border text-muted-foreground border-t p-4 text-center text-sm">
              © {new Date().getFullYear()} Nathan Lazo
            </footer>
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
