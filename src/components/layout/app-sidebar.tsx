"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Wallet } from "lucide-react";

import { useExpenseDialog } from "~/components/expenses/expense-dialog-provider";
import { Button } from "~/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { useAppSettings } from "~/hooks/use-app-settings";
import { isActiveRoute, NAV_ITEMS } from "~/lib/navigation";
import { siteConfig } from "~/lib/seo";

export function AppSidebar() {
  const pathname = usePathname();
  const { openCreate } = useExpenseDialog();
  const { currency, monthlyBudget, formatAmount } = useAppSettings();
  const { isMobile, setOpenMobile } = useSidebar();

  const closeOnMobile = () => isMobile && setOpenMobile(false);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="gap-3 p-4">
        <Link
          href="/"
          onClick={closeOnMobile}
          className="flex items-center gap-2.5"
        >
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <Wallet className="size-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-semibold">{siteConfig.name}</span>
            <span className="text-muted-foreground text-xs">
              Control de gastos
            </span>
          </span>
        </Link>

        <Button
          onClick={() => {
            closeOnMobile();
            openCreate();
          }}
        >
          <Plus className="mr-1 size-4" />
          Nuevo gasto
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActiveRoute(item, pathname)}
                    tooltip={item.title}
                  >
                    <Link href={item.href} onClick={closeOnMobile}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="bg-sidebar-accent text-sidebar-accent-foreground rounded-lg p-3 text-xs">
          <p className="font-medium">
            {monthlyBudget
              ? `Presupuesto: ${formatAmount(monthlyBudget)}`
              : "Sin presupuesto mensual"}
          </p>
          <p className="opacity-70">
            {monthlyBudget
              ? `Moneda ${currency}`
              : "Defínelo en Configuración para ver tu avance"}
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
