"use client";

import { ThemeProvider } from "~/lib/ThemeProvider";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import { TRPCReactProvider } from "~/trpc/react";

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
      </TRPCReactProvider>
    </ThemeProvider>
  );
}
