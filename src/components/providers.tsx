"use client";

import { ThemeProvider } from "~/lib/ThemeProvider";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import { TRPCReactProvider } from "~/trpc/react";
import { PWAInstallPrompt } from "~/components/pwa-install-prompt";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TRPCReactProvider>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster
          position="top-center"
          closeButton
          containerAriaLabel="Notificaciones"
        />
        <PWAInstallPrompt />
      </TRPCReactProvider>
    </ThemeProvider>
  );
}
