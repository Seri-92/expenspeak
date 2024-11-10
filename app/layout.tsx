import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const inter = Inter({subsets: ['latin']});

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
      <body className={cn(inter.className, 'min-h-dvh')}>
        <header className="h-16 border-b px-6 flex items-center">
          <Button asChild variant="ghost" className="font-bold text-xl">
            <Link href="/"> Expenspeak</Link>
          </Button>
          <Button asChild variant="ghost" className="font-bold text-xl">
            <Link href="/expenses">支出一覧</Link>
          </Button>
            {/* <h1 className='text-4xl font-bold mb-4'>Expenspeak</h1> */}
        </header>
        <main>{children}</main>
        <footer className="h-16 sticky top-full border-t px-6 flex items-center">
          <p>&copy; {new Date().getFullYear()} Expenspeak</p>
        </footer>
      </body>
    </html>
  );
}
