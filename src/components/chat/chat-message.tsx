"use client";

import { useState } from "react";
import Markdown from "react-markdown";

import { ChatToolPart } from "~/components/chat/chat-tool-part";
import { ReceiptViewer } from "~/components/expenses/receipt-viewer";
import type { ChatUIMessage } from "~/lib/chat-types";

/** El asistente responde en frases cortas; sobra el ritmo vertical de `prose`. */
const markdownComponents = {
  p: (props: React.ComponentProps<"p">) => (
    <p {...props} className="first:mt-0 last:mb-0" />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul {...props} className="my-2 list-disc space-y-1 pl-5" />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol {...props} className="my-2 list-decimal space-y-1 pl-5" />
  ),
  strong: (props: React.ComponentProps<"strong">) => (
    <strong {...props} className="font-semibold" />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a
      {...props}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-4"
    />
  ),
};

function UserAttachment({ url }: { url: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ver la foto en grande"
        className="focus-visible:ring-ring block overflow-hidden rounded-xl transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Foto del ticket que enviaste"
          className="image-outline max-h-56 rounded-xl object-cover"
        />
      </button>
      <ReceiptViewer
        url={isOpen ? url : null}
        onClose={() => setIsOpen(false)}
        title="Ticket enviado"
      />
    </>
  );
}

type ChatMessageProps = {
  message: ChatUIMessage;
  onRespondToApproval: (approvalId: string, approved: boolean) => void;
};

export function ChatMessage({
  message,
  onRespondToApproval,
}: ChatMessageProps) {
  if (message.role === "user") {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();

    // `flatMap` en vez de `filter` porque sólo así TypeScript se queda con el
    // tipo de la parte de archivo (y con su `url`).
    const images = message.parts.flatMap((part) =>
      part.type === "file" && part.mediaType.startsWith("image/") ? [part] : [],
    );

    return (
      <article className="flex flex-col items-end gap-2">
        {images.length > 0 ? (
          <div className="chat-enter flex max-w-[85%] flex-wrap justify-end gap-2">
            {images.map((part, index) => (
              <UserAttachment key={index} url={part.url} />
            ))}
          </div>
        ) : null}

        {text ? (
          <p className="bg-primary text-primary-foreground chat-enter max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm whitespace-pre-wrap">
            {text}
          </p>
        ) : null}
      </article>
    );
  }

  return (
    <article className="space-y-3">
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          if (!part.text.trim()) return null;
          return (
            <div
              key={index}
              className="chat-enter text-sm leading-relaxed [&>*+*]:mt-2"
            >
              <Markdown components={markdownComponents}>{part.text}</Markdown>
            </div>
          );
        }

        if (part.type.startsWith("tool-")) {
          return (
            <ChatToolPart
              key={index}
              part={part}
              onRespondToApproval={onRespondToApproval}
            />
          );
        }

        return null;
      })}
    </article>
  );
}
