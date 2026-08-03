import {
  ChartColumnBig,
  LayoutDashboard,
  Receipt,
  Settings,
  Sparkles,
  Tags,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Se muestra como subtítulo del header de cada página. */
  description: string;
  /** Si es false, la ruta sólo se marca activa con coincidencia exacta. */
  matchNested?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Inicio",
    href: "/",
    icon: LayoutDashboard,
    description: "Resumen de tus gastos del periodo",
  },
  {
    title: "Chat",
    href: "/chat",
    icon: Sparkles,
    description: "Sube un ticket y registra el gasto sin formularios",
    matchNested: true,
  },
  {
    title: "Gastos",
    href: "/expenses",
    icon: Receipt,
    description: "Registra y administra tus transacciones",
    matchNested: true,
  },
  {
    title: "Categorías",
    href: "/categories",
    icon: Tags,
    description: "Organiza tus gastos y define presupuestos",
    matchNested: true,
  },
  {
    title: "Reportes",
    href: "/reports",
    icon: ChartColumnBig,
    description: "Análisis detallado de tus gastos",
    matchNested: true,
  },
  {
    title: "Configuración",
    href: "/settings",
    icon: Settings,
    description: "Ajusta el ciclo, la moneda y la apariencia",
    matchNested: true,
  },
];

/** Rutas de la barra inferior móvil; configuración vive sólo en el sidebar. */
export const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => item.href !== "/settings",
);

export function isActiveRoute(item: NavItem, pathname: string) {
  if (!item.matchNested) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function getNavItem(pathname: string) {
  return NAV_ITEMS.find((item) => isActiveRoute(item, pathname));
}
