"use client";

import { ExternalLink } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

type ReceiptViewerProps = {
  /** URL del ticket a mostrar; `null` mantiene el visor cerrado. */
  url: string | null;
  onClose: () => void;
  title?: string;
};

/** Visor a pantalla casi completa para revisar el ticket sin salir de la app. */
export function ReceiptViewer({
  url,
  onClose,
  title = "Ticket",
}: ReceiptViewerProps) {
  return (
    <Dialog open={Boolean(url)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] gap-3 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{title}</DialogTitle>
        </DialogHeader>

        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Foto del ticket"
              className="w-full rounded-lg border object-contain"
            />
            <Button asChild variant="outline" className="w-full">
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 size-4" />
                Abrir original
              </a>
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
