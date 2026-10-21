import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Hextech LoL Hub | Random Tướng 5 Đường & AI Phân Tích Trận Đấu",
  description:
    "Ứng dụng Next.js quay ngẫu nhiên 5 tướng Liên Minh Huyền Thoại (TOP/JG/MID/AD/SP) và phân tích chuyên sâu trận đấu LMHT bằng AI qua Riot Match-V5 API.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="light">
      <body className="antialiased selection:bg-teal-600 selection:text-white">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
