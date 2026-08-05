"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";

const STORAGE_KEY = "pwa-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
    const [visible, setVisible] = useState(false);
    const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        // Si ya instaló o descartó, no mostramos nada.
        if (localStorage.getItem(STORAGE_KEY)) return;

        const handler = (e: Event) => {
            e.preventDefault();
            deferredPrompt.current = e as BeforeInstallPromptEvent;
            setVisible(true);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        const prompt = deferredPrompt.current;
        if (!prompt) return;
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        localStorage.setItem(STORAGE_KEY, outcome === "accepted" ? "installed" : "dismissed");
        deferredPrompt.current = null;
        setVisible(false);
    };

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_KEY, "dismissed");
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div
            role="dialog"
            aria-label="Instalar aplicación"
            className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-2xl backdrop-blur-md duration-300"
        >
            <div className="flex items-start gap-3">
                {/* Icono de app */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/icons/launchericon-192x192.png"
                        alt="App icon"
                        className="h-8 w-8 rounded-lg"
                    />
                </div>

                <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                        Instalar la app
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Accede más rápido desde tu pantalla de inicio.
                    </p>
                </div>

                {/* Botón cerrar */}
                <button
                    onClick={handleDismiss}
                    aria-label="Cerrar"
                    className="mt-0.5 rounded-md p-0.5 text-muted-foreground/70 transition-colors hover:text-foreground"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>
            </div>

            <div className="mt-3 flex gap-2">
                <Button
                    id="pwa-install-btn"
                    size="sm"
                    className="flex-1"
                    onClick={handleInstall}
                >
                    Instalar
                </Button>
                <Button
                    id="pwa-dismiss-btn"
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={handleDismiss}
                >
                    Ahora no
                </Button>
            </div>
        </div>
    );
}
