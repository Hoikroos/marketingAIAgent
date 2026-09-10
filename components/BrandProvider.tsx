"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Brand = {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  slogan: string;
  brandColor: string;
  logoUrl?: string | null;
  assistantLogoUrl?: string | null;
};

const DEFAULT_BRAND: Brand = {
  companyName: "Tân Phú Land",
  companyPhone: "",
  companyEmail: "",
  slogan: "Kiến tạo giá trị bền vững",
  brandColor: "#7c5cff",
  logoUrl: null,
  assistantLogoUrl: null,
};

const BrandContext = createContext<Brand>(DEFAULT_BRAND);
export const useBrand = () => useContext(BrandContext);

/** Nạp thông tin thương hiệu từ cài đặt hệ thống và áp màu lên theme */
export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetch("/api/settings-public")
        .then((r) => r.json())
        .then((d) => {
          if (!active) return;
          if (d.ok && d.settings) {
            const b: Brand = {
              companyName: d.settings.companyName || DEFAULT_BRAND.companyName,
              companyPhone: d.settings.companyPhone || "",
              companyEmail: d.settings.companyEmail || "",
              slogan: d.settings.slogan || DEFAULT_BRAND.slogan,
              brandColor: d.settings.brandColor || DEFAULT_BRAND.brandColor,
              logoUrl: d.settings.logoUrl || null,
              assistantLogoUrl: d.settings.assistantLogoUrl || null,
            };
            setBrand(b);
            const root = document.documentElement;
            root.style.setProperty("--brand", b.brandColor);
            root.style.setProperty("--brand-2", b.brandColor);
          }
        })
        .catch(() => {});
    };
    load();
    // Cho phép trang Cài đặt báo "đã đổi logo" để sidebar cập nhật ngay
    window.addEventListener("brand:refresh", load);
    return () => {
      active = false;
      window.removeEventListener("brand:refresh", load);
    };
  }, []);

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}