import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  /** Contenido extra bajo el valor, por ejemplo una barra de progreso. */
  children?: React.ReactNode;
  className?: string;
};

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  isLoading,
  children,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("gap-2", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
        {/* El icono es una marca de apoyo, no un dato: se queda en el gris de
            marca para que el número sea lo único que compite por atención. */}
        <Icon className="text-brand size-4 shrink-0" />
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-20" />
          </>
        ) : (
          <>
            <div className="text-2xl font-semibold tabular-nums">
              {value}
            </div>
            {hint ? (
              <p className="text-muted-foreground text-xs">{hint}</p>
            ) : null}
            {children}
          </>
        )}
      </CardContent>
    </Card>
  );
}
