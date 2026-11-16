import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Códigos de elemento (CTO-IUB-00551) e números de porta, como nos marcadores de campo.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Neutra Map Editor", template: "%s · Neutra Map Editor" },
  description: "Gestão da rede FTTH e das portas compartilhadas no marketplace Neutra+.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b232c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}>
      <body className="flex h-dvh flex-col overflow-hidden bg-concrete text-ink">{children}</body>
    </html>
  );
}
