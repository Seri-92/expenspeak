import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
      <body>
        <header>
          <div className='p-4'>
            <h1 className='text-4xl font-bold mb-4'>Expenspeak</h1>
          </div>
        </header>
        <main>{children}</main>
        <footer>
          <div className='p-4'>
            <p>&copy; {new Date().getFullYear()} Expenspeak</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
