import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/umbra/auth-provider";
import { PwaRegister } from "@/components/umbra/pwa-register";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Umbra Codex", template: "%s · Umbra Codex" },
  description:
    "Grimório digital para fichas, campanhas e regras de RPG de fantasia sombria.",
  applicationName: "Umbra Codex",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
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
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
