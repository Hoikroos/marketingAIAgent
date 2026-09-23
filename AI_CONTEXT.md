# AI_CONTEXT.md — Tài liệu dự án dành cho AI

> **Dành cho AI (bất kỳ AI nào):** Đây là tài liệu DUY NHẤT mô tả toàn bộ dự án — kiến trúc, data model,
> API, quy ước code. Hãy ĐỌC FILE NÀY TRƯỚC khi sửa/thêm code để có đủ bối cảnh, không phải mở từng file.
>
> **An toàn bảo mật:** File này KHÔNG chứa mật khẩu, API key hay connection string. Tất cả bí mật nằm
> trong biến môi trường (Render Environment / `.env` — không được commit). Việc file này public trên
> GitHub không giúp ai đăng nhập trái phép hay gọi API vượt qua phân quyền.

---

## 0. PROMPT MẪU — dán cho AI khi cần sửa/viết code

```
Bạn là kỹ sư làm việc trên dự án "AI Real Estate Marketing" (Next.js 14 App Router + TypeScript
+ Prisma + PostgreSQL). Đọc file AI_CONTEXT.md ở thư mục gốc trước khi trả lời.

Quy tắc:
- Tuân thủ conventions trong AI_CONTEXT.md (import "@/", PageShell, useToast, router.refresh(),
  status tiếng Việt đúng chuỗi, mọi CRUD qua API route — không gọi Prisma trực tiếp từ client).
- Không đổi hành vi hiện có trừ khi được yêu cầu.
- Sau khi sửa, chạy "npx tsc --noEmit" để kiểm tra type.
```

---

## 1. TECH STACK & LỆNH CHẠY

| Thành phần | Công nghệ |
|---|---|
| Framework | **Next.js 14** (App Router), TypeScript strict |
| UI | React 18 + Tailwind CSS 3, font Inter, theme tối (navy + tím + vàng đồng) |
| Database | **PostgreSQL (Neon)** qua **Prisma ORM** (`prisma/schema.prisma`, `provider = "postgresql"`) |
| Auth | **NextAuth v4** — JWT + Credentials (email/mật khẩu), cookie `maxAge` 30 ngày |
| Hash mật khẩu | `node:crypto` scrypt (`lib/password.ts`) |
| Biểu đồ | recharts · Icons: lucide-react (re-export ở `components/icons.tsx`) |
| AI | GROQ / OpenAI-compatible (tuỳ chọn — có fallback template nội bộ khi không có key) |
| Deploy | **Render** (auto-deploy từ GitHub main) |

### Scripts (package.json)
```
npm run dev         # chạy dev server localhost:3000
npm run build       # build production
npm run db:push     # đồng bộ schema vào DB (prisma db push)
npm run db:generate # prisma generate (tự chạy khi npm install qua postinstall)
npm run db:seed     # npx tsx prisma/seed.ts — tạo user + settings mẫu
npm run db:cleanup  # xoá dữ liệu demo
```

### Biến môi trường (đặt trong `.env` local / Render Environment — KHÔNG commit)
```
DATABASE_URL      # connection string Neon Postgres (BẮT BUỘC)
NEXTAUTH_SECRET   # chuỗi ngẫu nhiên dài (BẮT BUỘC để đăng nhập)
NEXTAUTH_URL      # vd https://<app>.onrender.com
GROQ_API_KEY / AI_BASE_URL / AI_MODEL   # AI Content Studio + Trợ lý AI (tuỳ chọn)
GEMINI_API_KEY / OPENAI_API_KEY         # provider AI khác (tuỳ chọn)
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY    # Web Push notification (tuỳ chọn)
CRON_SECRET       # bảo vệ /api/cron (tuỳ chọn)
```

---

## 2. CẤU TRÚC THƯ MỤC

```
app/
  layout.tsx                  ← Root layout: Providers, RouteLoader, PushManager, logo từ DB
  page.tsx                    ← redirect("/dashboard")
  login/ forgot-password/ forbidden/   ← trang công khai
  dashboard/                  ← TOÀN BỘ trang nghiệp vụ (bảo vệ bởi middleware.ts):
    page.tsx                  ← Dashboard tổng quan
    activity/ ads/ analytics/ assistant/ calendar/ chat/ content/ content-studio/(+new)
    daily-reports/ leads/(+new) profile/(+password) reports/ settings/ social/
    team/ tools/utm/ trends/ users/ work-reports/ work-stats/
  api/                        ← Route Handlers (xem mục 5)
components/                   ← UI + logic client (xem mục 8)
lib/                          ← Nghiệp vụ dùng chung (xem mục 4, 6, 7)
prisma/schema.prisma          ← Data model (xem mục 3)
middleware.ts                 ← Chặn /dashboard + /api khi chưa đăng nhập (NextAuth getToken)
```

---

## 3. DATA MODEL (prisma/schema.prisma)

> Sửa model xong PHẢI chạy: `npx prisma db push` (cập nhật DB) + `npx prisma generate` (cập nhật client).

| Model | Trường chính | Ghi chú |
|---|---|---|
| **User** | name, email (unique), role, avatar, phone, bio, socialYoutube/Tiktok/Facebook/Instagram, passwordHash (scrypt), permissions (JSON string), active, jobTitle, lastActiveAt | role "Admin" hoặc "Marketing"...; `isAdminLike()` = role Admin HOẶC permissions chứa "*" |
| **Task** | title, assignee (tên string), status, priority, deadline?, createdById | Công việc giao nhóm |
| **Content** | title, platform, type, tone?, script?, caption?, hashtags?, views, leads, score, scheduledAt?, authorId? | Bài viết / video marketing |
| **Lead** | name, phone?, source, status, purpose?, contacted, responseStatus, ownerId?, utmSource/Medium/Campaign/Content/... | Khách hàng tiềm năng |
| **AdCampaign** | name, platform, objective, status, dailyBudget/totalBudget/spent (Float), impressions, reach, clicks, conversions, likes, comments, shares, videoViews, watchTime, startDate, endDate?, ownerId | Chạy quảng cáo |
| **Trend** | title, platform, category, views, growth, score, recommendation?, source ("ai"/"manual"), ownerId? | Radar xu hướng BĐS |
| **SocialMetric** | platform, channel, followers, views, engagement, **videosPosted** (số video đã đăng trong tuần), weekLabel ("YYYY-Wxx"), note?, ownerId? | Số liệu MXH nhập theo tuần; unique [platform, channel, weekLabel, ownerId] |
| **SocialChannel** | platform, name | Danh mục kênh MXH (vd "Pháp Lý") |
| **Report** | title, period ("week"/"month"), periodLabel, employeeId, status, fileName?, filePath?, submittedAt?, createdById | Báo cáo công việc (file đính kèm) |
| **DailyReport** | userId, userName, date (string), tasksDone, note? | Nhật ký công việc hằng ngày, unique [userId, date] |
| **StoredFile** | path (PK, vd "avatars/avatar_x.jpg"), mime, size, data (Bytes) | **MỌI file upload lưu VÀO DB** (ổ đĩa Render là tạm thời, mất khi deploy) |
| **ActivityLog** | userId?, userName?, module, action, detail?, ipAddress?, createdAt | Lịch sử thao tác mọi chức năng |
| **Notification** | userId, type, title, content, read, link?, refId?, fileName?, filePath? | Thông báo in-app; có user "broadcast" (system@company.vn) |
| **PushSubscription** | userId, endpoint (unique), p256dh, auth | Web Push |
| **CalendarEvent** | userId, userName, title, note?, eventDate | Sự kiện ngoài trên Lịch nội dung |
| **AssistantConversation / AssistantMessage** | sessionId?, userId, userName, role, content... | Lịch sử chat Trợ lý AI |
| **Friendship / Message / ChatGroup / GroupMember / GroupMessage** | — | Module chat nhóm + bạn bè |
| **Setting** | key (unique), value, + các cột cấu hình AI (aiProvider, aiModel, aiApiKey, openaiApiKey, geminiApiKey...), notify* (Boolean) | Bảng cấu hình hệ thống |

### Giá trị status (chuỗi tiếng Việt — PHẢI dùng ĐÚNG)
- **Task.status:** `"Chờ thực hiện"` / `"Đang thực hiện"` / `"Đã hoàn thành"`
- **Lead.status:** `"Mới"` / `"Đang tư vấn"` / `"Đã chốt"` / `"Không tiềm năng"`
- **Lead.contacted:** `"Đã liên hệ"` / `"Chưa liên hệ"`
- **AdCampaign.status:** `"Đang chạy"` / `"Tạm dừng"` / `"Kết thúc"`
- **Report.status:** `"Chưa nộp"` / `"Đã nộp"`
- **Trend.source:** `"ai"` / `"manual"`

---

## 4. TRUY CẤP DỮ LIỆU

- `lib/prisma.ts` — PrismaClient singleton qua `globalThis` (chống leak khi HMR). Import: `import { prisma } from "@/lib/prisma"`.
- `components/db.ts` — hàm đọc dùng chung cho server component:
  `getContents / getTopContents / getUpcomingContents / getCalendarEvents / getLeads / getStaffUsers / getAssigneeUsers / getTasks / getActivityLogs / getOverviewStats`.
- Dashboard `work-stats` và `analytics` gọi prisma trực tiếp (tổng hợp trong JS — đủ cho quy mô demo).

---

## 5. REST API (`app/api/...`)

**Quy ước chung:** mỗi route `export async function GET/POST/PATCH/DELETE(req)`.
Response luôn `{ ok: true, ... }`, lỗi `{ ok: false, error: "..." }` (HTTP 400/401/403/404/500).
Client luôn kiểm tra `res.ok && data.ok`. **Route ghi dữ liệu PHẢI gọi `requirePermApi("module_action")`** ở đầu handler.

| Route | Mục đích | Phương thức |
|---|---|---|
| `/api/contents` | CRUD nội dung | GET/POST/PATCH/DELETE |
| `/api/tasks` | CRUD công việc nhóm (xóa chỉ Admin) | GET/POST/PATCH/DELETE |
| `/api/leads` + `/api/leads/export` | CRUD lead + xuất Excel | GET/POST/PATCH/DELETE |
| `/api/ads` + `/api/ads/[id]` | CRUD chiến dịch quảng cáo | GET/POST/PATCH/DELETE |
| `/api/trends` + `/api/trends/ai-filter` | Xu hướng: CRUD theo owner, thu thập AI, lọc theo công ty | GET/POST/PATCH/DELETE |
| `/api/social` | Số liệu MXH theo tuần | GET/POST/PATCH/DELETE |
| `/api/social-channels` | Danh mục kênh MXH (Admin quản) | GET/POST/DELETE |
| `/api/profile` + `/api/profile/avatar` | Hồ sơ cá nhân + ảnh đại diện (lưu DB) | GET/PATCH + POST/DELETE |
| `/api/settings` | Cấu hình hệ thống (Admin) | GET/PUT |
| `/api/settings-public` | Cấu hình công khai (logo, tên công ty — không cần Admin) | GET |
| `/api/settings/logo` + `/api/settings/assistant-logo` | Upload logo công ty / chatbot (lưu DB) | POST/DELETE |
| `/api/users` + `/api/users/[id]/profile` + `/api/users/reset-token` | Quản lý tài khoản (Admin) + hồ sơ bạn bè + sinh mã reset mật khẩu | GET/POST/PATCH/DELETE |
| `/api/auth/[...nextauth]` | NextAuth handler | GET/POST |
| `/api/auth/lock-status` + `/api/auth/reset-password` | Trạng thái khóa đăng nhập + đặt lại mật khẩu (công khai) | GET/POST |
| `/api/work-reports` (+`/[id]/upload`, `/[id]/file`, `/[id]/preview`, `/export`) | Báo cáo công việc: giao/nộp/tải/xem trước/xuất | GET/POST/PATCH/DELETE |
| `/api/work-reports/general` | **BÁO CÁO CHUNG tháng**: GET trả dữ liệu tổng hợp theo tuần/nhân viên (Dashboard); POST `{year, month, mode: "synthesize"|"word"}` — chạy AI tổng hợp (lib/monthlyReport.ts), cache vào Setting `generalReport_<Y>-<MM>`, mode "word" trả file .docx (lib/docx.ts tự dựng ZIP, không cần lib ngoài) | GET/POST |
| `/api/dailyreports` | Nhật ký công việc hằng ngày | GET/POST/PATCH |
| `/api/notifications` (+`/upload`, `/[id]/file`) | Thông báo + file đính kèm (lưu DB) | GET/POST |
| `/api/assistant` + `/api/assistant/history` + `/api/assistant/settings` + `/api/assistant/upload` | Trợ lý AI (stream NDJSON) + lịch sử + cài đặt + upload đính kèm | GET/POST/PATCH/PUT/DELETE |
| `/api/chat/upload` | Ảnh chat nhóm (lưu DB) | POST |
| `/api/messages`, `/api/messages/conversations`, `/api/messages/unread-count` | Chat 1-1 | GET/POST |
| `/api/groups` + `/api/groups/[id]/messages` | Chat nhóm | GET/POST |
| `/api/friends` + `/api/friends/accept` + `/api/friends/search` | Kết bạn | GET/POST |
| `/api/calendar-events` | Sự kiện ngoài trên lịch | GET/POST/DELETE |
| `/api/files/[...path]` | Phục vụ file upload: đọc từ DB trước, fallback ổ đĩa | GET |
| `/api/online` | Heartbeat "đang hoạt động" | GET/POST |
| `/api/push` | Đăng ký Web Push (VAPID) | GET/POST |
| `/api/ai/test` | Kiểm tra cấu hình AI (Admin) | POST |
| `/api/generate-content` | Sinh nội dung AI (GROQ/fallback template) | POST |
| `/api/automation/run` + `/api/cron` | Chạy job tự động (thông báo tuần, reminder...) — cron có CRON_SECRET | GET/POST |
| `/api/search?q=` | Tìm kiếm nhanh (lead/content) | GET |
| `/api/health` | Kiểm tra DB connected | GET |

---

## 6. AUTH & PHÂN QUYỀN (RBAC)

- **Đăng nhập:** NextAuth Credentials (email + mật khẩu) — cấu hình ở `lib/auth.ts` (JWT strategy, session 30 ngày, `updateAge` 1 giờ). Trang login riêng `pages.signIn = "/login"`. Có khóa IP tạm thời khi sai mật khẩu nhiều lần (`lib/rateLimit.ts`).
- **Middleware** (`middleware.ts`): chặn mọi `/dashboard` + `/api` (trừ route công khai) khi không có token hợp lệ.
- **Phân quyền** (`lib/permissions.ts`):
  - Mỗi module có các action: vd `social` → `social_view`, `social_create`, `social_update`, `social_delete`, `social_export`.
  - `canAccess(user, "key")` — kiểm tra 1 quyền; `isAdminLike(user)` — role "Admin" hoặc permissions chứa `"*"`.
  - Quyền mặc định nhân viên mới: mọi action của STAFF_MODULES, trừ `DEFAULT_EXCLUDED` (team_update, team_delete, ads_update, các thao tác ghi/xoá/xuất của social...). Admin cấp thêm trong Cài đặt → Phân quyền.
- **Kiểm tra quyền 3 tầng (BẮT BUỘC khi thêm trang/feature mới):**
  1. Trang server component: `await requirePerm("module")` (`lib/guard.ts`)
  2. Trang "use client": bọc `<ClientGuard perm="module">`
  3. Route API ghi dữ liệu: `await requirePermApi("module_action")`
- **Ghi log:** mọi thao tác gọi `logActivity(module, action, detail)` (`lib/activity.ts`) → bảng ActivityLog → trang Lịch sử hoạt động + trang Thống kê công việc.
- **jwt callback** (`lib/auth.ts`): làm mới role/permissions từ DB ở MỖI request → admin đổi quyền có hiệu lực NGAY (user bị `active=false` bị thu hồi toàn bộ quyền).

---

## 7. LƯU TRỮ FILE (quan trọng!)

- **MỌI file upload (avatar, logo, ảnh chat, file báo cáo, file thông báo) lưu VÀO DATABASE** — bảng `StoredFile` (Postgres bytea), qua `lib/storage.ts`:
  - `saveFile(rel, buffer)` — upsert theo `rel` (vd `avatars/avatar_x.jpg`) + mirror ra ổ đĩa (best-effort)
  - `readFileStored(rel)` — đọc DB trước, fallback ổ đĩa `<cwd>/uploads` rồi `<cwd>/public/uploads` (file cũ)
  - `deleteStoredFile(rel)` — xóa DB + ổ đĩa
- Lý do: Render free tier dùng **ổ đĩa tạm thời** — deploy/restart là mất file. DB (Neon) không bao giờ bị reset.
- File phục vụ qua route `/api/files/[...path]` với MIME tự nhận từ phần mở rộng.
- **KHÔNG lưu file mới vào ổ đĩa trực tiếp nữa** — luôn dùng `lib/storage.ts`.

---

## 8. UI CONVENTIONS

- **Layout:** trang server component dùng `PageShell` (`components/page-shell.tsx`, props title/subtitle); riêng Dashboard dùng `DashboardLayout` (`components/layout.tsx`). Menu sidebar tự ẩn theo quyền (`components/sidebar.tsx`, nhóm: Tổng quan / Nội dung & AI / Kinh doanh / Vận hành / Quản trị).
- **Client component** phải có `"use client"` ở dòng đầu.
- **Import path alias:** `"@/components/..."`, `"@/lib/..."` — icons import từ `./icons` (re-export lucide-react), KHÔNG import trực tiếp `lucide-react`.
- **UI kit:** `components/ui.tsx` — `Kpi`, `Status`, `Field`, `Spinner`, `Toggle`, `EmptyState`. Modal dùng chung `components/Modal.tsx` (ESC + backdrop). Phân trang `components/Pagination.tsx`. Lọc theo URL `components/UrlFilters.tsx`.
- **Toast:** `useToast()` từ `components/toast` (đã bọc trong root layout; ngoài provider trả no-op).
- **Làm mới dữ liệu sau mutation:** client gọi `router.refresh()` (App Router tự re-render server component).
- **CSS:** theme qua CSS variables (`--bg/--panel/--panel2/--text/--border...` trong globals.css); class tiện ích `.card`, `.input`, `.btn-primary` đã định nghĩa sẵn — đừng tự viết lại.
- **Biểu đồ:** recharts; tooltip style chung `background: var(--panel2)`.
- **Xuất Excel:** dùng thư viện `exceljs` (vd SocialStatusPanel, ExportLeadsButton).
- **Confirm/xác nhận:** `Swal` (sweetalert2) hoặc `confirm()` — theo style từng component hiện có.

---

## 9. BẢO MẬT — những điều AI cần biết

- **KHÔNG BAO GIỜ** hardcode mật khẩu / API key / connection string vào code. Tất cả qua biến môi trường.
- Repo GitHub là **public** — mọi thứ commit lên đều ai cũng đọc được. `AI_CONTEXT.md` được thiết kế an toàn để public (chỉ mô tả kiến trúc).
- `.env` đã nằm trong `.gitignore` — không bao giờ commit.
- `prisma/seed.ts`: KHÔNG đặt mật khẩu cứng — seed sinh mật khẩu NGẪU NHIÊN và chỉ in ra console 1 lần.
- Mật khẩu hash bằng scrypt (`lib/password.ts`: `hashPassword` / `verifyPassword`) — không dùng lib ngoài.
- Route `/api/cron` nên được bảo vệ bằng `CRON_SECRET` (query param) trước khi cấu hình cron công khai.
- Rate limit đăng nhập (`lib/rateLimit.ts`): khóa IP+email tạm thời khi sai quá nhiều lần.

---

## 10. CHECKLIST — thêm trang / tính năng MỚI

1. Thêm model vào `prisma/schema.prisma` (nếu cần) → `npx prisma db push` + `npx prisma generate`.
2. Thêm module + actions vào `PERMISSION_GROUPS` trong `lib/permissions.ts` (nhãn tiếng Việt).
3. Tạo Route Handler `app/api/<feature>/route.ts` — mọi handler ghi dữ liệu gọi `requirePermApi`.
4. Tạo trang server component `app/dashboard/<feature>/page.tsx` với `await requirePerm("module")` + `PageShell` hoặc `DashboardLayout`.
5. Tạo client component trong `components/` (nếu cần tương tác).
6. Thêm mục menu vào `components/sidebar.tsx` (kèm `perm`, `icon`, `group`) — menu tự ẩn theo quyền.
7. Status / nhãn dùng đúng chuỗi tiếng Việt (mục 3).
8. Nếu có upload file → dùng `lib/storage.ts` (KHÔNG ghi ổ đĩa trực tiếp).
9. Ghi log thao tác qua `logActivity(...)` để thống kê công việc phản ánh đúng.
10. Chạy `npx tsc --noEmit` kiểm tra, rồi cập nhật lại chính file AI_CONTEXT.md này.

---

## 11. LƯU Ý ĐÃ BIẾT (quirks)

- Render free tier: service ngủ sau ~15 phút không truy cập; **ổ đĩa tạm thời** — mọi file ngoài DB sẽ mất khi deploy (đã xử lý bằng StoredFile).
- Session đăng nhập 30 ngày (đã tăng từ 12 giờ để không phải đăng nhập lại mỗi sáng).
- `components/db.ts` và nhiều chỗ dùng `as any` — cẩn thận khi thêm field Prisma mới.
- `Trend.source = "ai"` — trend thu thập tự động; trend thủ công là `"manual"`.
- Trang `work-stats` (Thống kê công việc) tổng hợp theo tuần/tháng/quý/năm từ ActivityLog + các model trạng thái — nếu thêm nguồn dữ liệu mới, cập nhật `components/WorkStatsBoard.tsx`.
- Trang `leads` có khối "SỐ LƯỢNG KHÁCH THEO TUẦN/THÁNG" (`components/LeadsTimeStats.tsx`, biểu đồ recharts xếp lớp theo trạng thái + bảng số liệu) — server page gom theo cửa sổ thời gian (tuần bắt đầu thứ Hai như `lib/automation.ts`, tái dùng `periodKey/periodLabel` của `lib/workStats.ts`), dữ liệu query TOÀN BỘ lead (không giới hạn 200 dòng như LeadsTable).
- **Báo cáo chung tháng** (`lib/monthlyReport.ts` + `/api/work-reports/general` + `components/GeneralReportPanel.tsx` trên Dashboard): gom theo tuần của tháng — báo cáo công việc nộp (đọc text .docx bằng `extractDocxParagraphs` từ `lib/docx.ts`, file lưu StoredFile), nhật ký ngày (`DailyReport.date` dạng "YYYY-MM-DD"), nội dung/lead/task/MXH. AI tổng hợp từng nhân viên (prompt + parse nhãn `[TUẦN ...]`) với fallback mẫu tự động khi thiếu key/lỗi; kết quả cache ở Setting key `generalReport_<Y>-<MM>` (không thêm model mới). Quyền: GET ai cũng xem được (nhân viên chỉ thấy phần mình), POST chỉ Admin/quản lý (`isAdminLike`/`users`/`reports_work_create`). File Word tạo bằng `buildDocx` — đã kiểm chứng round-trip bằng `scripts/test-docx.ts` (`npx tsx scripts/test-docx.ts`).
- `AI_CONTEXT.md` cần được cập nhật KÈM THEO mọi thay đổi lớn của source (model mới, route mới, trang mới).



