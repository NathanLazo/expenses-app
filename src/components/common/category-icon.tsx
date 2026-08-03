import { cn } from "~/lib/utils";

const SIZES = {
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  lg: "size-12 text-lg",
} as const;

type CategoryIconProps = {
  icon: string;
  color: string;
  size?: keyof typeof SIZES;
  className?: string;
};

/**
 * Burbuja con el emoji de la categoría. Usa el color como fondo translúcido
 * y como borde para que funcione igual en tema claro y oscuro.
 */
export function CategoryIcon({
  icon,
  color,
  size = "md",
  className,
}: CategoryIconProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: `${color}1f`, borderColor: `${color}66` }}
    >
      {icon}
    </span>
  );
}
