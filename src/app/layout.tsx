import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Random Tướng LMHT 5 Đường | TOP - JG - MID - AD - SP",
  description:
    "Ứng dụng Next.js quay ngẫu nhiên 5 tướng Liên Minh Huyền Thoại theo từng đường Top, Rừng (JG), Mid, Xạ Thủ (AD), Hỗ Trợ (SP) và hỗ trợ roll lại từng đường riêng biệt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased selection:bg-[#0AC8B9] selection:text-[#010A13]">
        {children}
      </body>
    </html>
  );
}
