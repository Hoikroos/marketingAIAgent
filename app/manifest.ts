import { MetadataRoute } from "next";

/** Manifest PWA — cho phép "Thêm vào màn hình chính" như một app */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marketing Tân Phú Land",
    short_name: "Tân Phú Land",
    description: "Nền tảng Marketing Bất động sản ứng dụng AI",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#1b98e0",
    orientation: "portrait",
    icons: [
      { src: "/api/files/images/logoTPL.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/files/images/logoTPL.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
