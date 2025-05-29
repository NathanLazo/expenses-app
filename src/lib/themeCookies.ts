"use server";
import { cookies } from "next/headers";

export const setThemeCookie = async (theme: "light" | "dark") => {
  const cookiesObject = await cookies();
  cookiesObject.set("theme", theme);
};

export const getThemeCookie = async () => {
  const cookiesObject = await cookies();
  const theme = cookiesObject.get("theme")?.value;
  return theme;
};
