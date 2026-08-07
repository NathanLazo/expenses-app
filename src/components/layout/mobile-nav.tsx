"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveRoute, MOBILE_NAV_ITEMS } from "~/lib/navigation";
import { cn } from "~/lib/utils";

/**
 * Barra inferior estilo app nativa. Sólo en móvil; en escritorio la navegación
 * vive en el sidebar.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
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
                  // Más aire abajo que arriba: las esquinas redondeadas de la
                  // pantalla recortan en diagonal las etiquetas de los extremos
                  // (la primera del primer destino, la última del último).
                  "flex min-w-0 flex-col items-center gap-1 px-1 pt-2.5 pb-4 text-[11px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="size-5 shrink-0" />
                {/* Con seis destinos las etiquetas largas no caben en pantallas
                    angostas: se recortan en vez de desbordar la barra. */}
                <span className="w-full truncate text-center">
                  {item.title}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
