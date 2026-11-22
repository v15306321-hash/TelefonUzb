import type { Metadata, Viewport } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Админ-панель", template: "%s · Админ TELEFON.UZB" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-dvh bg-black text-cloud">{children}</body>
    </html>
  );
}
