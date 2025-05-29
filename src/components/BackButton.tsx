"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "~/components/ui/button";

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show back button on home page
  if (pathname === "/") {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.back()}
      aria-label="Go back"
    >
      <ChevronLeft className="h-5 w-5" />
    </Button>
  );
}
