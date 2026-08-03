"use client";

import { usePathname } from "next/navigation";

import { ThemeMenu } from "~/components/theme-menu";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { getNavItem } from "~/lib/navigation";
import { siteConfig } from "~/lib/seo";

export function AppHeader() {
  const pathname = usePathname();
  const current = getNavItem(pathname);

  return (
    <header className="bg-background/95 sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base leading-tight font-semibold">
          {current?.title ?? siteConfig.name}
        </h1>
        <p className="text-muted-foreground hidden truncate text-xs sm:block">
          {current?.description ?? siteConfig.description}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <ThemeMenu />
      </div>
    </header>
  );
}
