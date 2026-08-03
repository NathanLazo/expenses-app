"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

import { useExpenseDialog } from "~/components/expenses/expense-dialog-provider";
import { Button } from "~/components/ui/button";
import { isActiveRoute, MOBILE_NAV_ITEMS } from "~/lib/navigation";
import { cn } from "~/lib/utils";

/**
 * Barra inferior estilo app nativa. Sólo en móvil; en escritorio la navegación
 * vive en el sidebar.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { openCreate } = useExpenseDialog();

  return (
    <>
      <Button
        size="icon"
        onClick={openCreate}
        aria-label="Nuevo gasto"
        className="mb-safe fixed right-4 bottom-20 z-40 size-14 rounded-full shadow-lg md:hidden"
      >
        <Plus className="size-6" />
      </Button>

      <nav className="bg-background/95 pb-safe fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden">
        <ul
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${MOBILE_NAV_ITEMS.length}, minmax(0, 1fr))`,
          }}
        >
          {MOBILE_NAV_ITEMS.map((item) => {
            const active = isActiveRoute(item, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="size-5" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
