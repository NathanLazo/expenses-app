import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "~/hooks/useTheme";

export default function ThemeSwitcher({
  isDropdown,
}: {
  isDropdown?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  return (
    <button
      className="flex h-full w-full cursor-pointer items-center justify-between rounded-xl px-2 py-1.5"
      onClick={() => {
        setTheme(theme === "light" ? "dark" : "light");
      }}
    >
      {isDropdown && <span>Theme</span>}
      {theme === "light" && (
        <SunIcon className="h-5 w-5 text-indigo-950/80 hover:text-indigo-950/60 dark:text-indigo-50/80 dark:hover:text-indigo-50/60" />
      )}
      {theme === "dark" && (
        <MoonIcon className="h-5 w-5 text-indigo-950/80 hover:text-indigo-950/60 dark:text-indigo-50/80 dark:hover:text-indigo-50/60" />
      )}
    </button>
  );
}
