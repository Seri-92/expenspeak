import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppProvider } from "@/components/custom/AppContext";
import AppHeader from "@/components/custom/AppHeader";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Expenspeak",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={cn(geistSans.className, "min-h-dvh")}>
        <AppProvider>
          <AppHeader />
          <main>{children}</main>
          <footer className="sticky top-full flex h-16 items-center border-t px-6">
            <p>&copy; {new Date().getFullYear()} Expenspeak</p>
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
