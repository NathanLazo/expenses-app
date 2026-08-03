"use client";

import { AppHeader } from "~/components/layout/app-header";
import { AppSidebar } from "~/components/layout/app-sidebar";
import { MobileNav } from "~/components/layout/mobile-nav";
import { ExpenseDialogProvider } from "~/components/expenses/expense-dialog-provider";
import { PeriodProvider } from "~/components/providers/period-provider";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

/**
 * Layout único de la aplicación: sidebar en escritorio (sheet en móvil),
 * header pegajoso con el título de la ruta activa y barra inferior móvil.
 * Todas las páginas se montan dentro de este shell.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PeriodProvider>
      <ExpenseDialogProvider>
        <SidebarProvider>
          {/* Primer elemento enfocable: salta el sidebar y el header, que se
              repiten en todas las rutas. */}
          <a
            href="#contenido"
            className="bg-background focus:ring-ring fixed -top-20 left-3 z-50 rounded-md border px-3 py-2 text-sm font-medium shadow-md transition-[top] duration-150 focus:top-3 focus:ring-[3px] focus:outline-none motion-reduce:transition-none"
          >
            Saltar al contenido
          </a>
          <AppSidebar />
          <SidebarInset className="min-w-0">
            <AppHeader />
            <main
              id="contenido"
              tabIndex={-1}
              className="flex-1 px-4 pt-4 pb-24 outline-none md:px-6 md:pb-8"
            >
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </main>
            <MobileNav />
          </SidebarInset>
        </SidebarProvider>
      </ExpenseDialogProvider>
    </PeriodProvider>
  );
}
