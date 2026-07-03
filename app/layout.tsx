import type { Metadata } from "next";
import { Open_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin", "cyrillic"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Kingdom Guard companion",
  description:
    "KG Companion — игровой компаньон для поиска персонажей и просмотра их исторической мощи в игре Kingdom Guard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${openSans.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-border/70 text-subtle text-xs mt-8">
          <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap gap-x-4 gap-y-1 justify-between">
            <span>KG Companion — панель офицеров</span>
            <span>данные: kg.dbapp.ru · Next.js</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
