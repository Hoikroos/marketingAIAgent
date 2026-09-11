import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import Providers from "@/components/Providers";
import RouteLoader from "@/components/RouteLoader";
import { getLogoUrl } from "@/lib/brandLogo";
import { getTrackingIds } from "@/lib/tracking";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-sans",
  display: "swap",
});

const DEFAULT_LOGO = "/api/files/images/logoTPL.png";

/** Viewport mobile: maximumScale=1 chặn iOS Safari TỰ ZOOM khi focus vào ô nhập
 *  (font-size nhỏ < 16px vẫn dùng được) — pinch zoom của người dùng vẫn hoạt động
 *  trên iOS 10+ vì Safari bỏ qua maximum-scale với cử chỉ pinch. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/** Metadata động: favicon/icon theo logo tùy chỉnh (nếu có) trong Cài đặt hệ thống. */
export async function generateMetadata(): Promise<Metadata> {
  const logo = (await getLogoUrl()) || DEFAULT_LOGO;
  return {
    title: "Marketing Tân Phú Land",
    description:
      "Nền tảng Marketing Bất động sản ứng dụng AI: săn trend, sinh content, quản lý chiến dịch, leads và tự động hoá n8n.",
    icons: {
      icon: logo,
      shortcut: logo,
      apple: logo,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { pixelId, gaId } = await getTrackingIds();
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <body>
        <RouteLoader />
        <Providers>{children}</Providers>

        {/* Meta Pixel — cấu hình trong Cài đặt → Website & Tracking */}
        {pixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
          </Script>
        )}

        {/* Google Analytics 4 */}
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}