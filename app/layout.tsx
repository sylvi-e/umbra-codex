import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/umbra/auth-provider";
import { PwaRegister } from "@/components/umbra/pwa-register";
import { ThemeToggle } from "@/components/umbra/theme-toggle";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const description =
  "Grimório digital para fichas, campanhas e regras de RPG de fantasia sombria.";

export const metadata: Metadata = {
  metadataBase: new URL("https://umbra-codex.vercel.app"),
  title: { default: "Umbra Codex", template: "%s · Umbra Codex" },
  description,
  applicationName: "Umbra Codex",
  authors: [{ name: "Umbra Codex" }],
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Umbra Codex",
    title: "Umbra Codex",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Umbra Codex",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#09080e",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geist.variable} ${mono.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
        <PwaRegister />
        <ThemeToggle />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
