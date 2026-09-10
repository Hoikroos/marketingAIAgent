"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Thanh tiến trình mảnh trên cùng — hiển thị mỗi khi người dùng bấm chuyển
 * giữa các chức năng (pathname thay đổi) để có cảm giác "đang tải" rõ ràng.
 * Kết hợp với skeleton `app/dashboard/loading.tsx` khi trang đang render.
 */
export default function RouteLoader() {
  const pathname = usePathname();
  const [seq, setSeq] = useState(0);
  const firstRef = useRef(true);

  useEffect(() => {
    // Bỏ qua lần mount đầu tiên (tránh hiện bar khi vừa mở trang)
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    setSeq((s) => s + 1);
  }, [pathname]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[300] h-[3px] overflow-hidden">
      {seq > 0 && (
        <div
          key={seq}
          className="route-bar h-full w-full bg-gradient-to-r from-[#1b98e0] via-[#63c0f5] to-[#1b98e0] shadow-[0_0_10px_rgba(27,152,224,0.9)]"
        />
      )}
    </div>
  );
}