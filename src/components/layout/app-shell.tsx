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
          <AppSidebar />
          <SidebarInset className="min-w-0">
            <AppHeader />
            <main className="flex-1 px-4 pt-4 pb-24 md:px-6 md:pb-8">
              <div className="mx-auto w-full max-w-6xl">{children}</div>
            </main>
            <MobileNav />
          </SidebarInset>
        </SidebarProvider>
      </ExpenseDialogProvider>
    </PeriodProvider>
  );
}
