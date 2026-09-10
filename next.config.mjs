/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Chống clickjacking (không cho nhúng vào iframe của trang khác)
  { key: "X-Frame-Options", value: "DENY" },
  // Chống MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Không rò nguồn/thông tin qua Referer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  // Ẩn header "X-Powered-By: Next.js" (giảm thông tin cho kẻ tấn công)
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;