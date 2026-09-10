"use client";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/toast";
import { BrandProvider } from "@/components/BrandProvider";
import OnlineHeartbeat from "@/components/OnlineHeartbeat";

/**
 * Bọc toàn bộ Provider dùng React Context trong 1 client component.
 * (Bắt buộc: không thể đặt SessionProvider/ThemeProvider trực tiếp trong Server Component layout.)
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <BrandProvider>
          <ToastProvider>
            <OnlineHeartbeat />
            {children}
          </ToastProvider>
        </BrandProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}