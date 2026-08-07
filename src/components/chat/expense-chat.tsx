"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type FileUIPart,
} from "ai";
import { AlertTriangle, Camera, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatComposer } from "~/components/chat/chat-composer";
import { ChatMessage } from "~/components/chat/chat-message";
import { useReceiptAttachments } from "~/components/chat/use-receipt-attachments";
import { Button } from "~/components/ui/button";
import type { ChatUIMessage } from "~/lib/chat-types";
import { api } from "~/trpc/react";

/** Arranques de conversación: cubren registrar, consultar y editar. */
const SUGGESTIONS = [
  "Gasté 250 en el súper",
  "¿Cuánto llevo gastado este periodo?",
  "¿En qué categoría se me va más dinero?",
  "Enséñame mis últimos 5 gastos",
];

export type ChatComposerActions = {
  openCamera: () => void;
  openGallery: () => void;
};

export function ExpenseChat() {
  const utils = api.useUtils();
  const [input, setInput] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerActions = useRef<ChatComposerActions | null>(null);
  /** Sólo seguimos el stream si el usuario no se fue a leer más arriba. */
  const stickToBottom = useRef(true);

  const {
    attachments,
    addFiles,
    remove: removeAttachment,
    clear: clearAttachments,
    isUploading,
  } = useReceiptAttachments();

  const {
    messages,
    sendMessage,
    setMessages,
    addToolApprovalResponse,
    regenerate,
    status,
    error,
    stop,
  } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    // Tras confirmar (o rechazar) una acción, el turno continúa solo.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onFinish: () => {
      // El chat escribe en la misma base que el resto de la app: sin esto, el
      // dashboard y la lista de gastos se quedarían con datos viejos.
      void utils.invalidate();
    },
  });

  const isStreaming = status === "submitted" || status === "streaming";
  const isEmpty = messages.length === 0;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !stickToBottom.current) return;
    // Salto instantáneo: con `smooth` cada token del stream pelearía con el
    // desplazamiento anterior y la lista temblaría.
    container.scrollTop = container.scrollHeight;
  }, [messages, status]);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    stickToBottom.current =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      80;
  }, []);

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const files: FileUIPart[] = attachments
        .filter((attachment) => attachment.url)
        .map((attachment) => ({
          type: "file",
          mediaType: attachment.mediaType,
          url: attachment.url!,
        }));

      if (!trimmed && files.length === 0) return;

      stickToBottom.current = true;
      void sendMessage({
        // Sin texto el modelo no sabe qué hacer con la foto; el encargo va implícito.
        text: trimmed || "Registra el gasto de este ticket.",
        files,
      });

      setInput("");
      clearAttachments();
    },
    [attachments, clearAttachments, sendMessage],
  );

  const statusLabel = error
    ? "Ocurrió un error al responder"
    : status === "submitted"
      ? "Enviando tu mensaje"
      : status === "streaming"
        ? "El asistente está escribiendo"
        : messages.length > 0
          ? "Respuesta lista"
          : "";

  return (
    <div className="flex h-[calc(100svh-11rem)] min-h-[26rem] flex-col md:h-[calc(100svh-7rem)]">
      {/* Región estable: los lectores de pantalla anuncian el cambio de estado
          sin leer el stream carácter por carácter. */}
      <p role="status" aria-live="polite" className="sr-only">
        {statusLabel}
      </p>

      {!isEmpty ? (
        <div className="flex justify-end pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              stop();
              setMessages([]);
            }}
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Nueva conversación
          </Button>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        {isEmpty ? (
          <EmptyChat
            onPickSuggestion={submit}
            onTakePhoto={() => composerActions.current?.openCamera()}
          />
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-5 pb-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRespondToApproval={(id, approved) =>
                  addToolApprovalResponse({ id, approved })
                }
              />
            ))}

            {status === "submitted" ? <ThinkingIndicator /> : null}

            {error ? (
              <div
                role="alert"
                className="border-destructive/40 bg-destructive/5 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center"
              >
                <p className="text-destructive flex flex-1 items-start gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  No pude responder. Revisa tu conexión e inténtalo de nuevo.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void regenerate()}
                >
                  Reintentar
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <ChatComposer
          value={input}
          onValueChange={setInput}
          onSubmit={() => submit(input)}
          onStop={stop}
          onAddFiles={(files) => void addFiles(files)}
          onRemoveAttachment={removeAttachment}
          attachments={attachments}
          isStreaming={isStreaming}
          isUploading={isUploading}
          actionsRef={composerActions}
        />
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <p className="text-muted-foreground chat-enter flex items-center gap-1.5 text-sm">
      <span aria-hidden className="flex gap-1">
        <span className="chat-thinking-dot size-1.5 rounded-full bg-current" />
        <span
          className="chat-thinking-dot size-1.5 rounded-full bg-current"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="chat-thinking-dot size-1.5 rounded-full bg-current"
          style={{ animationDelay: "300ms" }}
        />
      </span>
      <span className="sr-only">El asistente está pensando</span>
    </p>
  );
}

function EmptyChat({
  onPickSuggestion,
  onTakePhoto,
}: {
  onPickSuggestion: (text: string) => void;
  onTakePhoto: () => void;
}) {
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 px-2 text-center">
      <div className="space-y-2">
        <span
          aria-hidden
          className="bg-muted text-muted-foreground mx-auto flex size-11 items-center justify-center rounded-full"
        >
          <Sparkles className="size-5" />
        </span>
        <h2 className="text-lg font-semibold">
          Registra un gasto en 5 segundos
        </h2>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          Sube la foto de un ticket y deduzco el monto, el comercio y la
          categoría. También puedes pedirme cuentas del periodo.
        </p>
      </div>

      <Button size="lg" onClick={onTakePhoto}>
        <Camera className="mr-2 size-4" />
        Tomar foto del ticket
      </Button>

      <ul className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              onClick={() => onPickSuggestion(suggestion)}
              className="bg-card hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring rounded-full border px-3 py-1.5 text-sm transition-[background-color,color,scale] duration-150 focus-visible:ring-[3px] focus-visible:outline-none active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
