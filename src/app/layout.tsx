import "~/styles/globals.css";

import { type Metadata } from "next";

import { AppShell } from "~/components/layout/app-shell";
import { Providers } from "~/components/providers";
import { siteConfig, siteUrl } from "~/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteConfig.name,
    template: `${siteConfig.name} - %s`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    title: siteConfig.name,
    description: siteConfig.description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // El sistema tipográfico es system-ui (ver globals.css): no hay descarga de
    // fuente, así que tampoco hay variable de next/font que colgar del <html>.
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-svh antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
