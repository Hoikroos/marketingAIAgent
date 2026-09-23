/**
 * SCHEDULER NỘI BỘ — Tự động thông báo KHÔNG cần cron ngoài / Cron Secret.
 *
 * Server Next.js tự chạy các tác vụ trong lib/automation.ts mỗi 60 giây:
 *   1. Nhắc đăng bài (7h sáng + 30 phút trước giờ đăng)
 *   2. Follow-up lead cũ (sau followUpDays ngày)
 *   3. Báo cáo tuần (1 lần mỗi tuần thứ Hai)
 *
 * An toàn vì bên trong runAllJobs() đã có chống trùng thông báo
 * (notifiedToday / notifiedSince) nên chạy dày cũng không spam.
 *
 * Endpoint /api/cron?key=CRON_SECRET vẫn giữ nguyên để dùng cron ngoài
 * nếu muốn (tuỳ chọn), và nút "Chạy ngay" trong Cài đặt vẫn hoạt động.
 */

const INTERVAL_MS = 60_000; // 1 phút
const FIRST_RUN_DELAY_MS = 15_000; // đợi server khởi động xong rồi chạy lần đầu

export async function register() {
  // Chỉ chạy trong runtime Node.js (bỏ qua Edge)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Chống đăng ký nhiều lần (dev hot-reload gọi register lại nhiều lần)
  const g = globalThis as unknown as { __automationScheduler?: boolean };
  if (g.__automationScheduler) return;
  g.__automationScheduler = true;

  const run = async () => {
    try {
      const { runAllJobs } = await import("./lib/automation");
      const res = await runAllJobs();
      if (
        res.reminders ||
        res.followups ||
        res.weekly ||
        res.taskDeadlines ||
        res.calendarEvents ||
        res.viral
      ) {
        console.log(
          `[automation] ${new Date().toISOString()}`,
          JSON.stringify(res)
        );
      }
    } catch (err) {
      console.error("[automation] Lỗi khi chạy tác vụ tự động:", err);
    }
  };

  setTimeout(run, FIRST_RUN_DELAY_MS).unref?.();
  setInterval(run, INTERVAL_MS).unref?.();

  console.log(
    `[automation] Scheduler nội bộ đã bật — chạy tác vụ tự động mỗi ${
      INTERVAL_MS / 1000
    }s (không cần cron ngoài).`
  );
}
