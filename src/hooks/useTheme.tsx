"use client";
import React, { useState, useContext, createContext, useEffect } from "react";
import { setThemeCookie } from "~/lib/themeCookies";

const ThemeContext = createContext<{
  theme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
} | null>(null);

export const ThemeProviderContext = ({
  children,
  defaultTheme,
}: {
  children: React.ReactNode;
  defaultTheme: "light" | "dark";
}) => {
  const [theme, setTheme] = useState<"light" | "dark">(defaultTheme ?? "dark");

  useEffect(() => {
    setThemeCookie(theme).catch((error) => {
      console.error("Error setting theme cookie:", error);
    });
  }, [theme]);

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme hook no trae su ThemeProvider Hook");
  }
  return context;
};
