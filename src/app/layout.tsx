import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "Zyphnaro — AI Career Intelligence Platform",
  description: "Don't just find opportunities. Know which ones are worth pursuing.",
};

// Colours the phone browser bar with the brand blue.
export const viewport: Viewport = { themeColor: "#3d5afe" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
