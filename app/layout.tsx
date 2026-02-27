import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PixelPress",
    template: "%s | PixelPress",
  },
  description: "Play 100+ simple games. No ads.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PixelPress",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navItems = [
    { href: "/play", label: "Play" },
    { href: "/create", label: "Create" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <header className="fixed inset-x-0 top-0 z-50 h-[var(--pp-header-h)] border-b border-slate-200/10 bg-slate-950/95 backdrop-blur supports-[backdrop-filter]:bg-slate-950/85">
          <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-2 px-4">
            <Link href="/" className="text-lg font-semibold tracking-tight text-slate-100">
              PixelPress
            </Link>
            <nav className="flex min-w-0 flex-nowrap items-center gap-1 overflow-hidden whitespace-nowrap text-sm sm:gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-md px-2 py-1 text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-[calc(var(--pp-header-h)+2rem)]">{children}</main>
      </body>
    </html>
  );
}
