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
  // Bật instrumentation.ts: scheduler nội bộ chạy tác vụ tự động ngay trong server
  // (nhắc đăng bài, báo cáo tuần) — không cần cron ngoài + Cron Secret
  experimental: {
    instrumentationHook: true,
    // web-push dùng module Node (http/https) — giữ nguyên outside bundle
    serverComponentsExternalPackages: ["web-push"],
  },
  webpack: (config, { nextRuntime }) => {
    // instrumentation.ts được bundle cho cả edge, nhưng các tác vụ tự động
    // (web-push, prisma) CHỈ chạy trong Node.js. Thay module Node builtin
    // bằng module rỗng trong bundle edge để build không lỗi.
    if (nextRuntime === "edge") {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        assert: false,
        buffer: false,
        crypto: false,
        dns: false,
        fs: false,
        http: false,
        https: false,
        net: false,
        path: false,
        querystring: false,
        stream: false,
        tls: false,
        url: false,
        util: false,
        zlib: false,
      };
    }
    return config;
  },
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