"use client";
import React from "react";
import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "~/hooks/useTheme";

const ThemeContextProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useTheme();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme={theme}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
};

export default ThemeContextProvider;
