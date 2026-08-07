"use client";

import { ArrowUp, Camera, ImageUp, Loader2, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ChatComposerActions } from "~/components/chat/expense-chat";
import type { ChatAttachment } from "~/components/chat/use-receipt-attachments";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const MAX_TEXTAREA_HEIGHT = 160;

type ChatComposerProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  onAddFiles: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  attachments: ChatAttachment[];
  isStreaming: boolean;
  isUploading: boolean;
  /** Deja que el estado vacío dispare la cámara sin duplicar los inputs. */
  actionsRef?: React.RefObject<ChatComposerActions | null>;
};

export function ChatComposer({
  value,
  onValueChange,
  onSubmit,
  onStop,
  onAddFiles,
  onRemoveAttachment,
  attachments,
  isStreaming,
  isUploading,
  actionsRef,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    // `capture` sólo existe donde el sistema puede abrir la cámara; es más
    // fiable que adivinar por el ancho de la ventana.
    setHasCamera("capture" in document.createElement("input"));
  }, []);

  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = {
      openCamera: () =>
        (cameraInputRef.current ?? galleryInputRef.current)?.click(),
      openGallery: () => galleryInputRef.current?.click(),
    };
  }, [actionsRef]);

  // Autoajuste de altura: crece con el texto hasta un tope y luego hace scroll.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  const canSend =
    !isStreaming &&
    !isUploading &&
    (value.trim().length > 0 || attachments.some((item) => item.url));

  const handleSubmit = () => {
    if (!canSend) return;
    onSubmit();
    // Devuelve el foco al campo para poder encadenar mensajes sin tocar nada.
    textareaRef.current?.focus();
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    onAddFiles([...fileList]);
  };

  return (
    <div className="bg-background pb-safe pt-2">
      <div
        className={cn(
          "bg-card rounded-xl border transition-[border-color,box-shadow] duration-150",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        )}
      >
        {attachments.length > 0 ? (
          <ul className="flex flex-wrap gap-2 p-2 pb-0">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="chat-enter relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachment.previewUrl}
                  alt="Ticket adjunto"
                  className={cn(
                    "image-outline size-16 rounded-lg object-cover transition-opacity duration-150",
                    attachment.status !== "ready" && "opacity-50",
                  )}
                />

                {attachment.status === "uploading" ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="size-4 animate-spin text-white drop-shadow" />
                    <span className="sr-only">
                      Subiendo foto, {Math.round(attachment.progress)}%
                    </span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(attachment.id)}
                    aria-label="Quitar foto adjunta"
                    className="bg-background focus-visible:ring-ring hover:bg-accent absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border shadow-sm transition-[background-color,scale] duration-150 focus-visible:ring-[3px] focus-visible:outline-none active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
                  >
                    <X className="size-3.5" />
                  </button>
                )}

                {attachment.status === "error" ? (
                  <span className="bg-destructive absolute inset-x-0 bottom-0 rounded-b-lg py-0.5 text-center text-[10px] font-medium text-white">
                    Falló
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <label htmlFor="chat-input" className="sr-only">
          Mensaje para el asistente
        </label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            // Enter envía; Shift+Enter salta de línea. `isComposing` protege a
            // los teclados con acentos y a los IME.
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              handleSubmit();
            }
          }}
          rows={1}
          enterKeyHint="send"
          placeholder="Sube la foto de un ticket o escribe «gasté 250 en el súper»"
          className="placeholder:text-muted-foreground block max-h-40 w-full resize-none bg-transparent px-3.5 py-3 text-base leading-6 outline-none"
        />

        <div className="flex items-center gap-1 p-2 pt-0">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
          />

          {hasCamera ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10"
              aria-label="Tomar foto del ticket"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="size-5" />
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10"
            aria-label="Adjuntar foto desde la galería"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImageUp className="size-5" />
          </Button>

          <p className="text-muted-foreground ml-1 hidden flex-1 truncate text-xs sm:block">
            {isUploading
              ? "Subiendo la foto…"
              : "Enter para enviar · Shift + Enter para saltar de línea"}
          </p>
          <span className="flex-1 sm:hidden" />

          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="size-10 rounded-full"
              aria-label="Detener la respuesta"
              onClick={onStop}
            >
              <Square className="size-4 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              className="size-10 rounded-full"
              aria-label="Enviar mensaje"
              disabled={!canSend}
              onClick={handleSubmit}
            >
              {isUploading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ArrowUp className="size-5" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
