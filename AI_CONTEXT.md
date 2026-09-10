# AI_CONTEXT.md — Bản đồ toàn bộ dự án AI Real Estate Marketing

> **Mục đích file này:** Tài liệu DUY NHẤT mô tả toàn bộ source code, kiến trúc, data model, API, UI conventions.
> Khi dùng AI khác (fix bug, thêm tính năng, refactor), hãy đọc file này TRƯỚC để có đủ bối cảnh
> mà **không phải mở lại từng file**, tiết kiệm token và tránh hiểu sai.
>
> File này tự sinh từ việc đọc toàn bộ source. Nếu source thay đổi, hãy cập nhật lại file này.

---

## 0. PROMPT MẪU — dán cho AI khác khi muốn nó fix/viết code

```
Bạn là kỹ sư làm việc trên dự án "AI Real Estate Marketing" (Next.js App Router + TypeScript + Prisma + SQLite).
Hãy đọc file AI_CONTEXT.md ở thư mục gốc để nắm TOÀN BỘ kiến trúc, data model, API, UI conventions
TRƯỚC khi trả lời. Chỉ mở thêm file cụ thể nếu bạn thực sự cần chi tiết vượt ngoài tài liệu này.

Quy tắc khi fix/viết code:
- Tuân thủ đúng conventions trong AI_CONTEXT.md (import "@/", PageShell, useToast, router.refresh(), status tiếng Việt...).
- Không thay đổi hành vi hiện có trừ khi được yêu cầu.
- Mọi thao tác CRUD phải qua API route (không gọi Prisma trực tiếp từ client).
- Sau khi sửa, đánh giá xem có cần npm run build / lint để kiểm tra không.
</prompt>
```

---

## 1. TỔNG QUAN & TECH STACK

Nền tảng Marketing AI cho doanh nghiệp bất động sản. Giao diện tiếng Việt, theme tối (navy + tím + vàng đồng).

| Thành phần | Công nghệ |
|---|---|
| Framework | **Next.js 14** (App Router) — `app/` |
| Ngôn ngữ | **TypeScript** (strict mode) |
| UI | React 18 + **Tailwind CSS 3** (`tailwind.config.ts`) |
| Database | **Prisma ORM** + hiện đang dùng **SQLite** (`prisma/dev.db`) |
| Biểu đồ | **recharts** |
| Icons | **lucide-react** (re-export qua `components/icons.tsx`) |
| Font chữ | Inter (`app/layout.tsx`, `--font-sans`) |
| Auth | **NextAuth v4** (JWT + Credentials) — ĐÃ DÙNG cho đăng nhập + phân quyền RBAC |
| Hash mật khẩu | `node:crypto` (scrypt) trong `lib/password.ts` — KHÔNG cần cài lib |
| AI API | GROQ / OpenAI-compatible (tuỳ chọn, tự fallback AI nội bộ) |

**Ghi chú quan trọng:**
- `prisma/schema.prisma` hiện ghi `provider = "sqlserver"` nhưng **HUONG_DAN_CHAY.md** nói project đã chuyển sang SQLite. Khi chạy `npm run setup`, Prisma dùng SQLite (`prisma/dev.db`). Nếu muốn SQL Server thật thì đổi provider trong schema lại thành `"sqlserver"`.
- Không cần cài DB ngoài — SQLite tự khởi tạo.

### package.json — scripts
```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint",
"postinstall": "prisma generate",
"setup": "prisma generate && prisma db push && tsx prisma/seed.ts",
"db:push": "prisma db push",
"db:generate": "prisma generate",
"db:seed": "tsx prisma/seed.ts"
```
- Prisma seed config: `"prisma": { "seed": "tsx prisma/seed.ts" }`

### Cách chạy
```bash
npm install
npm run setup        # sinh client + tạo db SQLite + seed dữ liệu demo
npm run dev          # mở http://localhost:3000/dashboard
```

---

## 2. CẤU TRÚC THƯ MỤC

```
app/                          ← Next.js App Router (route = thư mục)
  layout.tsx                  ← Root layout: globals.css, Inter font, ToastProvider
  page.tsx                    ← redirect("/dashboard")
  globals.css                 ← toàn bộ CSS variables + utility classes
  dashboard/                  ← Trang chính (đều dùng PageShell hoặc DashboardLayout)
    layout.tsx                ← KHÔNG tồn tại; layout dashboard nằm ở components/layout.tsx
    page.tsx                  ← Dashboard (KPI, AI Opportunity...)
    analytics/  calendar/  campaigns/(+new)  content/  content-studio/(+new)
    insights/   leads/(+new)  products/(+[id], +new)  reports/  settings/
    team/       trends/       workflow/(+new)
  api/                        ← Route Handlers (backend API)
    automation/content/  campaigns/  contents/  generate-content/  health/
    insights/  leads/  projects/  projects/[id]/  search/  settings/  tasks/  workflow/

components/                   ← UI + business helpers (viết hoa tên file)
  db.ts                       ← LỚP TRUY CẬP DB TẬP TRUNG (server-only)
  prisma: lib/prisma.ts       ← PrismaClient singleton global
  layout.tsx + page-shell.tsx ← Khung Dashboard (Sidebar + Header + content)
  sidebar.tsx  header.tsx     ← Điều hướng & header (search, notif, help)
  ui.tsx                      ← Kpi, SectionTitle, Status, EmptyState, Spinner, Field, Toggle
  toast.tsx                   ← Hệ thống toast (ToastProvider + useToast)
  Modal.tsx                   ← Modal dùng chung (ESC, backdrop)
  icons.tsx                   ← Re-export lucide-react
  charts.tsx                  ← PerformanceChart (line), ReportChart (bar)
  Create*Form.tsx + Create*Modal.tsx  ← Form tạo + modal cho mỗi entity
  ContentTable.tsx  LeadsTable.tsx    ← Bảng client-side có filter/đổi status/xoá
  TaskStatusBadge.tsx  CampaignStatusToggle.tsx  WorkflowCard.tsx  RunAllWorkflowsButton.tsx
  TrendsBoard.tsx  CalendarBoard.tsx  ReportsControls.tsx  DeleteProjectButton.tsx

prisma/
  schema.prisma               ← Data model (Prisma)
  seed.ts                     ← Dữ liệu demo tiếng Việt (admin + user có password)
  dev.db                      ← Database SQLite (auto tạo)

lib/
  prisma.ts                   ← PrismaClient singleton
  password.ts                 ← hash/verify mật khẩu (scrypt, `node:crypto`)
  permissions.ts              ← RBAC: ALL_PERMISSIONS, canAccess, isAdminLike
  auth.ts                     ← authOptions (NextAuth) + getCurrentUser()
  guard.ts                    ← requireUser / requirePerm / requireAdmin / requirePermApi

middleware.ts                 ← chặn truy cập chưa đăng nhập (/dashboard, /api)
types/next-auth.d.ts          ← khai báo kiểu Session (id, role, permissions)
app/api/auth/[...nextauth]/route.ts ← auth handler
app/api/users/route.ts        ← admin quản lý user & phân quyền
app/login/page.tsx            ← trang đăng nhập
app/forbidden/page.tsx        ← trang "không có quyền"
app/dashboard/users/page.tsx  ← trang quản lý tài khoản (admin)
components/ClientGuard.tsx    ← chặn quyền phía client (trang "use client")
components/UsersManager.tsx   ← UI quản lý user + gán quyền

public/projects/              ← Ảnh SVG mẫu dự án
.env  .env.example            ← DATABASE_URL, GROQ_API_KEY, AI_BASE_URL, AI_MODEL, NEXTAUTH_SECRET, NEXTAUTH_URL
tailwind.config.ts  tsconfig.json  postcss.config.mjs  next-env.d.ts
```

### Định tuyến import
- `tsconfig.json` → `"paths": {"@/*": ["./*"]}` → import `@/components/db`, `@/lib/prisma`, `@/components/ui`...
- Import trong file dùng quy tắc: components nội bộ dùng `./xxx` hoặc `@/components/xxx` (cả hai đều xuất hiện trong code).

---

## 3. DATA MODEL — Prisma (`prisma/schema.prisma`)

Tất cả model dùng `id Int @id @default(autoincrement())`. Ngày mặc định `@default(now())`.
**Trạng thái (status) là chuỗi tiếng Việt** — không enum Prisma.

| Model | Các trường chính | Quan hệ |
|---|---|---|
| **User** | name, email (unique), role (default "Marketing"), avatar, phone?, bio?, passwordHash?, permissions (JSON), active | contents[], leads[], tasks[], notifications[] |
| **Project** | name, location, type, **priceMin/priceMax Float** (tỷ), area, status (default "Đang bán"), image, description | contents[], campaigns[], leads[] |
| **Trend** | title, platform, views Int, growth Float, score Int, category?, recommendation? | — |
| **Content** | title, platform, type, status (default "Ý tưởng"), tone?, script?, caption?, hashtags?, views, engagement, leads, score, **scheduledAt DateTime?**, authorId?, projectId? | author (User), project (Project) |
| **Campaign** | name, status (default "Đang chạy"), **startDate/endDate DateTime** (bắt buộc), views, leads, ctr Float, progress Int, projectId? | project |
| **Lead** | name, phone, source, status (default "Mới"), purpose? ("Ký gửi"/"Mua nhà"...), address?, budget?, projectId?, ownerId? | project, owner (User) |
| **Task** | title, assignee?, status (default "Đang thực hiện"), priority (default "Trung bình"), deadline?, ownerId? | owner |
| **Workflow** | name, description?, status (default "Running"), lastRun?, executions Int | — |
| **Insight** | type, title, description, priority (default "medium") | — |
| **SocialMetric** | platform, date, views, engagement, leads | — |
| **Setting** | companyName "Tân Phú Land", brandColor "#6d36e8", slogan, aiModel, n8nWebhook, openaiKey, dbName, dbServer, notifyTrend/notifyContent/notifyViral Boolean | 1 bản ghi duy nhất |
| **Notification** | userId, type (default "lead"), title, body?, refId?, read Boolean (default false), createdAt | user (User, onDelete Cascade) |
| **Report** | title, period ("week"\|"month"), periodLabel, employeeId, status ("Chưa nộp"\|"Đã nộp"), fileName?, filePath?, submittedAt?, createdById? | employee (User, NoAction), createdBy (User, SetNull) |

### Giá trị trạng thái (chuỗi tiếng Việt) — PHẢI dùng đúng
- **Project.status:** `"Đang bán"`, `"Sắp mở bán"`, ... (products check `=== "Đang bán"`)
- **Content.status:** `"Ý tưởng"`, `"Chờ duyệt"`, `"Đã đăng"`, `"Nháp"` (ContentTable `STATUSES` + toneOf)
- **Campaign.status:** `"Đang chạy"`, `"Tạm dừng"`, `"Sắp tới"` (CampaignStatusToggle: Đang chạy ↔ Tạm dừng)
- **Lead.status:** `"Mới"`, `"Đang tư vấn"`, `"Đã chốt"`, `"Không tiềm năng"` (LeadsTable)
- **Task.status:** `"Chờ thực hiện"`, `"Đang thực hiện"`, `"Đã hoàn thành"` (TaskStatusBadge CYCLE)
- **Task.priority:** `"Cao"`, `"Trung bình"`, `"Thấp"`
- **Workflow.status:** `"Running"`, `"Waiting"` (tiếng Anh!)
- **Insight.type:** `"opportunity"` | `"warning"`; priority `"high"|"medium"|"low"`

> Khi thêm trạng thái mới, cập nhật ở CẢ form + bảng + toneOf + status toggle tương ứng.

---

## 4. LỚP TRUY CẬP DB TẬP TRUNG (`components/db.ts`)

**Server-only helper** — không dùng trong client component. Mọi trang **server component (async)** gọi hàm này lấy dữ liệu cho render.

| Hàm | Trả về |
|---|---|
| `getTrends(limit=5)` | trend orderBy score desc |
| `getContents(limit=10)` | content include author+project, orderBy createdAt desc |
| `getCampaigns(limit=10)` | campaign include project, orderBy startDate desc |
| `getLeads(limit=20)` | lead include project+owner |
| `getProjects(limit=20)` | project orderBy createdAt desc |
| `getProject(id)` | 1 project include contents+campaigns+leads |
| `getWorkflows(limit=20)` | workflow orderBy id desc |
| `getTasks(limit=50)` / `getInsights(limit=20)` | task / insight orderBy desc |
| `getSettings()` | 1 setting (tự tạo nếu chưa có) |
| `getSocialMetrics(days=7)` | socialMetric orderBy date asc |
| `getPlatformSummary()` | gộp views/engagement/leads theo platform |
| `getDailySeries()` | gộp theo ngày (dd/MM) cho biểu đồ |
| `getOverviewStats()` | contentCount, totalViews, totalEngagement, totalLeads, campaignCount, conversionRate |
| `searchAll(q)` | { projects, leads, contents } |

- `lib/prisma.ts` = PrismaClient singleton qua `globalThis` (chống leak khi HMR dev).


---

## 5. REST API — Route Handlers (`app/api/...`)

**Quy ước chung:** mỗi route file khai báo `export async function GET/POST/PATCH/PUT/DELETE(req)`. Response luôn dạng `{ ok: boolean, ... }`, lỗi `{ ok:false, error:"..." }` (HTTP 400/404/500). Client kiểm tra `!res.ok || !data.ok`.

### 5.1 `contents` `/api/contents`
- **GET** → `{ contents }`
- **POST** body: `{ title*, platform*, type?, status?, projectId?, authorId?, scheduledAt?, script?, caption?, hashtags?, tone? }` → `{ content }`
- **PATCH** body: `{ id*, status* }` → `{ content }`
- **DELETE** `?id=` → `{ ok:true }`

### 5.2 `campaigns` `/api/campaigns`
- **GET** `{ campaigns }`; **POST** `{ name*, startDate*, endDate*, projectId? }`; **PATCH** `{ id*, status?, progress? }` (không có DELETE)

### 5.3 `leads` `/api/leads`
- **GET** `{ leads }`; **POST** `{ name*, phone*, source?, projectId?, budget? }` (source default "Website"); **PATCH** `{ id*, status* }`; **DELETE** `?id=`

### 5.4 `projects` `/api/projects` + `/api/projects/[id]`
- `projects`: **GET** `{ projects }`; **POST** `{ name*, location?, type?, priceMin?, priceMax?, image?, description? }`
- `projects/[id]`: **GET** include contents+campaigns+leads (404 nếu không có); **PATCH** (name/location/type/status/image/description/priceMin/priceMax); **DELETE**

### 5.5 `tasks` `/api/tasks`
- **GET** `{ tasks }`; **POST** `{ title*, assignee?, priority?, deadline? }` (status set "Chờ thực hiện"); **PATCH** `{ id*, status* }`

### 5.6 `workflow` `/api/workflow`
- **GET** `{ workflows }`; **POST** `{ name*, description? }` (status "Running")
- **PATCH** body: `{ id*, action: "toggle"|"run" }` — toggle đảo Running↔Waiting; run tăng executions, set lastRun, status Running
- **DELETE** `?id=`

### 5.7 `settings` `/api/settings`
- **GET** `{ settings }`; **PUT** body: companyName, brandColor, slogan, aiModel, n8nWebhook, openaiKey, dbName, dbServer (string) + notifyTrend/notifyContent/notifyViral (boolean)

### 5.8 `insights` `/api/insights` — **GET** `{ insights }`
### 5.9 `search` `/api/search?q=` — **GET** `{ projects, leads, contents }` (mỗi loại take 5, contains tên)

### 5.10 `generate-content` `/api/generate-content` ⭐ AI (GROQ / nội bộ)
- **POST** body: `{ title*, platform="TikTok", tone="Chuyên gia", length="60 giây", goal="Tăng lead" }`
- Trả `{ result: { hook, script, caption, hashtags, tone, platform, length, goal } }`
- **Nếu có key (GROQ/OpenAI-compatible từ .env hoặc Settings) → gọi thật:** base `https://api.groq.com/openai/v1/chat/completions`, model mặc định `llama-3.3-70b-versatile`, yêu cầu trả JSON `{hook,script,caption,hashtags}` rồi parse.
- **Không có key / lỗi API → tự fallback AI nội bộ** (template HOOK/SCRIPT/CAPTION/HASHTAG_POOL, chọn theo `hashStr(title+platform+tone)`), hoạt động ngoại tuyến.
- Cấu hình qua env: `GROQ_API_KEY`, `AI_BASE_URL`, `AI_MODEL` (hoặc `openaiKey` trong Settings).

### 5.11 `automation/content` `/api/automation/content`
- **POST** → gọi webhook n8n (`process.env.N8N_WEBHOOK_URL`). Nếu chưa cấu hình trả `{ok:true, message:"N8N_WEBHOOK_URL chưa cấu hình", payload:body}`.

### 5.12 `health` `/api/health`
- **GET** → `{ ok:true, database:"connected" }` (query `SELECT 1`)

### 5.13 `notifications` `/api/notifications`
- **GET** → `{ notifications, unread }` — danh sách thông báo của **user đang đăng nhập** (orderBy createdAt desc, take 50) + số chưa đọc.
- **PATCH** body `{ id }` → đánh dấu 1 tin đã đọc; `{ all: true }` → đánh dấu tất cả đã đọc (chỉ tin của user hiện tại).
- Khi **phân lead cho nhân viên** (`POST/PATCH /api/leads` có `ownerId` mới) → hệ thống tự tạo Notification `{userId: owner, type:"lead", title:"Lead mới được phân cho bạn", body:"tên • sđt", refId}`.

### 5.14 `profile` `/api/profile`
- **GET** → `{ user }` — thông tin **user đang đăng nhập**: id, name, email, phone, bio, role.
- **PATCH** body tùy ý: `{ name?, email?, phone?, bio?, currentPassword?, newPassword? }` → cập nhật hồ sơ. Đổi email kiểm tra trùng; đổi mật khẩu yêu cầu `currentPassword` đúng + `newPassword` ≥ 6 ký tự.
- Menu **hồ sơ cá nhân** (bấm avatar ở header) là dropdown có link dẫn sang trang: **Quản lý hồ sơ** → `/dashboard/profile`, **Đổi mật khẩu** → `/dashboard/profile?tab=password`, **Đăng xuất** → `signOut()`. Trang dùng `components/ProfileManager.tsx` + API này.

### 5.15 Báo cáo công việc — `/api/work-reports...`
- **GET `/api/work-reports`** → `{ reports, employees, isAdmin }`. Admin xem tất cả + kèm danh sách nhân viên; nhân viên chỉ thấy báo cáo của mình.
- **POST** body `{ title, period:"week"|"month", periodLabel, employeeIds:number[] }` → admin tạo & **giao báo cáo** cho nhiều nhân viên (1 Report/nhân viên).
- **POST `/api/work-reports/[id]/upload`** (multipart `file`) — nhân viên **nộp file Word (.doc/.docx)/PDF**. Chỉ chủ sở hữu hoặc admin. Xoá file cũ nếu nộp lại, set `status="Đã nộp"`.
- **GET `/api/work-reports/[id]/file`** → **tải file về** (admin hoặc chủ sở hữu). Return `new NextResponse(new Uint8Array(data), ...)`.
- **DELETE `/api/work-reports/[id]/file`** → nhân viên **xoá file** (nếu tải nhầm) → reset `status="Chưa nộp"`.
- File lưu trong thư mục `uploads/reports/` (đường dẫn tương đối lưu cột `filePath`), dir const trong `lib/reports.ts`.
- Quyền: module `reports_work` với các thao tác **view** (Xem) / **upload** (Nộp file) / **download** (Tải về) / **delete** (Xoá file). Admin (role `Admin`/`*`) được tất cả; giao báo cáo chỉ admin. UI ẩn nút theo quyền (`canUpload/canDownload/canDelete`). Page: `app/dashboard/work-reports`, component `components/ReportsWorkManager.tsx`, nav "Báo cáo công việc".

### 5.16 Thu thập trend — `/api/trends/collect`
- **POST** (quyền `trends` view): 
  1. **Lấy chủ đề THẬT đang nổi** (ưu tiên YouTube API nếu có `YOUTUBE_API_KEY` → Google Trends RSS VN).
  2. **GROQ chuyển thành 8 TREND NỘI DUNG BĐS** chủ yếu cho **TikTok & Facebook** (phong cách video ngắn/bài đăng): `title/platform/views/growth/score/category/recommendation`.
  3. `deleteMany` rồi `create` → Trend Radar hiển thị trend BĐS cho TikTok/FB.
- Nguồn hỏng → fallback GROQ sinh trực tiếp (source `"groq"`). Cả 2 lỗi → 502.
- `TrendsBoard` có nút "Thu thập trend mới (AI)" + tự refresh mỗi 60s.

---

## 6. LUỒNG DỮ LIỆU & MẪU CHÍNH (rất quan trọng khi fix)

### Server → Client (đọc)
1. Page là **async server component** gọi `getXxx()` trong `components/db.ts`.
2. Truyền dữ liệu làm **props** (thường qua `as any`) vào client components (ContentTable, LeadsTable, TrendsBoard...).

### Client → Server (ghi)
1. Client component (`"use client"`) gọi `fetch("/api/xxx", { method, headers, body })`.
2. Check `if (!res.ok || !data.ok) throw new Error(data.error...)`.
3. Thành công → `toast.success(...)` + **`router.refresh()`** (re-render server component để cập nhật dữ liệu).
4. Nếu ở trang `/new` → `router.push("/<danh mục>")`.

### Tạo mới entity — 2 chế độ (dùng chung `<CreateXxxForm>` + `<CreateXxxModal>`)
- **Modal:** page danh mục render `<CreateXxxModal projects={...} />`; modal mở `<CreateXxxForm onSuccess={close} ...>`.
- **Trang `/new`:** `<CreateXxxForm />`, sau khi submit nếu `pathname.endsWith("/new")` thì push về danh mục.

### Các trang `/new` hiện có
`content-studio/new`, `campaigns/new`, `leads/new`, `products/new`, `workflow/new` — mỗi cái render `PageShell` + `CreateXxxForm`.

---

## 7. UI COMPONENTS DÙNG CHUNG (`components/ui.tsx`, `toast.tsx`, `Modal.tsx`)

| Component | Props | Chức năng |
|---|---|---|
| `Kpi` | `icon, label, value, delta?, tone="up"\|"down"` | Card thẻ KPI |
| `SectionTitle` | `icon?, title, action?, onAction?, href?` | Tiêu đề section; nếu có href → link "Xem tất cả" |
| `Status` | `children, tone="blue"` | Badge; tone: green/yellow/red/purple/blue/gold |
| `EmptyState` | `title, desc` | Trạng thái rỗng |
| `Spinner` | `size=15` | Loader xoay |
| `Field` | `label, children` | Nhãn form (`label.field-label`) |
| `Toggle` | `checked, onChange, label?` | Switch boolean (Settings) |
| `useToast()` | `success/error/info/push(kind,title,desc)` | Toast; PHẢI nằm trong `<ToastProvider>` (root layout) |
| `Modal` | `open, onClose, title?, children` | Modal; ESC/backdrop đóng |

### Charts (`components/charts.tsx`)
- `PerformanceChart({data})` — LineChart (views/eng/leads); `ReportChart({data})` — BarChart.
- **Có `FALLBACK` (số liệu giả) khi data rỗng** — cẩn thận khi báo cáo trống.

---

## 8. HỆ THỐNG STYLING (`app/globals.css` + Tailwind)

**Theme tối cố định** (dù `darkMode:"class"`). CSS variables trong `:root`:

| Var | Giá trị | Dùng cho |
|---|---|---|
| `--bg` / `--bg-2` | `#070c14` / `#0a1220` | nền |
| `--panel`/`--panel2`/`--panel3` | `#0d1626`/`#101d31`/`#14233a` | panel/card |
| `--border` / `--border-soft` | `#1e2f47` / `#17263c` | viền |
| `--text` / `--muted` / `--muted-2` | `#eef3fb`/`#7d8fa8`/`#536178` | chữ |
| `--brand` / `--brand-2` | `#7c5cff` / `#a78bfa` | tím chủ đạo |
| `--gold` / `--gold-2` | `#e8b563` / `#f6d189` | vàng điểm nhấn |
| `--success`/`--warning`/`--danger`/`--info` | xanh/vàng/đỏ/xanh dương | trạng thái |

Tailwind extend: colors `ink/panel/panel2/purple/gold`, boxShadow `glow`, radius `xl2`.

### Utility classes (dùng layout, KHÔNG phải Tailwind thuần)
- Card: `.card`, `.card-hover`, `.glass`
- Nút: `.btn-primary` (tím), `.btn-gold` (vàng, chữ `#241705`), `.btn-danger`, `.btn-ghost`, `.btn-icon`
- Form: `.input`, `label.field-label`
- Trạng thái: `.badge` (rounded-full), `.progress` + `> span` thanh tiến độ
- Bảng: `table.data-table` (thead muted, hover tím)
- Hiệu ứng: `.animate-in`, `.pulse-dot`, `.toast-in`, `.skeleton`, `.gradient-text`, `.divider`
- Bố cục hay dùng: `grid grid-cols-2 xl:grid-cols-4 gap-4`, `grid lg:grid-cols-3 gap-5`

> Ưu tiên dùng các class này thay vì tự viết màu mới để giữ nhất quán. Panel tím cho section, vàng cho điểm nhấn (nút "Lưu vào Content" dùng `btn-gold`).
---

## 9. TRANG VÀ ROUTE → NGUỒN DỮ LIỆU

Mỗi trang = async server component dùng `PageShell` (trừ Dashboard dùng `DashboardLayout` trực tiếp).

| Route | Title | Lấy data từ | Client component |
|---|---|---|---|
| `/dashboard` | Dashboard | getTrends(5), getContents(4), getCampaigns(5), getWorkflows(4), getOverviewStats | PerformanceChart |
| `/dashboard/trends` | Trend Radar | getTrends(50) | TrendsBoard |
| `/dashboard/content-studio` | AI Content Studio | (client tự fetch) | gọi /api/generate-content, /api/contents |
| `/dashboard/content-studio/new` | | — | CreateContentForm |
| `/dashboard/calendar` | Content Calendar | getContents(200) → scheduled | CalendarBoard |
| `/dashboard/content` | Content Manager | getContents(200), getProjects(100) | CreateContentModal, ContentTable |
| `/dashboard/campaigns` (+/new) | Campaigns | getCampaigns(50), getProjects(100) | CreateCampaignModal, CampaignStatusToggle |
| `/dashboard/products` (+/[id], +/new) | Sản phẩm / Dự án | getProjects(100); [id]: getProject | CreateProjectModal, DeleteProjectButton |
| `/dashboard/analytics` | Social Analytics | getOverviewStats, getPlatformSummary, getDailySeries | PerformanceChart |
| `/dashboard/leads` (+/new) | Leads | getLeads(200), getProjects(100) | CreateLeadModal, LeadsTable |
| `/dashboard/insights` | AI Insights | getInsights(30), getTrends(3), getProjects(2) | — |
| `/dashboard/team` | Team Collaboration | getTasks(100) | CreateTaskModal, TaskStatusBadge |
| `/dashboard/workflow` (+/new) | Workflow (n8n) | getWorkflows(50) | CreateWorkflowModal, WorkflowCard, RunAllWorkflowsButton |
| `/dashboard/reports` | Báo cáo | getOverviewStats, getDailySeries | ReportsControls (xuất CSV) |
| `/dashboard/settings` | Cài đặt hệ thống | (client fetch /api/settings) | Toggle, Field |
| `/dashboard/profile` | Hồ sơ cá nhân | (client fetch /api/profile) | ProfileManager (tab Hồ sơ / Đổi mật khẩu) |

### Navigation (sidebar.tsx)
Dashboard, Trend Radar (HOT), AI Content Studio, Content Calendar, Content Manager, Campaigns, Sản phẩm/Dự án, Social Analytics, Leads (NEW), AI Insights, Team Collaboration, Workflow (n8n), Báo cáo, Cài đặt hệ thống.

### Lưu ý header.tsx
- Ô search gọi `/api/search?q=` (debounce 300ms). Nút "Tạo content" → `/dashboard/content-studio`.
- NOTIFICATIONS/HELP là dữ liệu tĩnh (hardcode), avatar "MT" hardcode — không lấy từ DB.

---

## 10. AI CONTENT STUDIO — flow đầy đủ
1. `trends/page.tsx` → TrendsBoard nút **"Phân tích BĐS"** → link `/dashboard/content-studio?title=<trend.title>`.
2. `content-studio/page.tsx` đọc `searchParams.get("title")` làm chủ đề mặc định.
3. Bấm "Tạo content với AI" → POST `/api/generate-content` → nhận `{hook, script, caption, hashtags}`.
4. Bấm "Lưu vào Content Manager" → POST `/api/contents` với `{ title, platform, type:"Video", tone, script, caption, hashtags, status:"Ý tưởng" }` → `router.push("/dashboard/content")`.

---

## 11. QUY ƯỚC CODE & CẠM BẪY KHI FIX (đọc kỹ)

1. **Client component bắt buộc `"use client"`** dòng đầu; server page là async. KHÔNG gọi Prisma/db.ts trong client.
2. **CRUD phải qua API route**, không gọi Prisma trực tiếp từ giao diện.
3. **Sau thao tác ghi:** luôn `router.refresh()` + `toast`. Thông báo tiếng Việt.
4. **Status dùng chuỗi tiếng Việt đúng chuỗi** (mục 3) — sai chữ cái = badge màu sai, toggle không chạy.
5. **`schema.prisma` ghi `sqlserver`** nhưng runtime đang SQLite. Đổi provider phải đổi cả `DATABASE_URL` trong `.env`.
6. **`priceMin/priceMax` Float (đơn vị tỷ)** — hiển thị `${p.priceMin} – ${p.priceMax} tỷ`.
7. **Biểu đồ có FALLBACK dữ liệu giả** — data rỗng vẫn vẽ mẫu. Seed XÓA HẾT dữ liệu rồi seed mới (chạy lại sẽ reset DB demo).
8. **`getDailySeries/getOverviewStats` đọc toàn bộ bảng rồi gộp trong JS** — không scale tốt, chỉ đủ demo.
9. **Nhiều chỗ dùng `any`** (`as any`) — cẩn thận khi thêm field Prisma mới.
10. **`SCRIPT_TEMPLATES` dùng `length.includes("30")`** — logic độ dài kịch bản ràng buộc; chỉ đổi 30/60.
11. **Toast nằm trong `<ToastProvider>`** (root layout); `useToast()` ngoài provider trả no-op fail-safe.
12. **Chưa có auth thực tế** dù đã cài next-auth — header hardcode "Marketing Team / Admin".

---

## 12. CHECKLIST KHI THÊM TÍNH NĂNG / ENTITY MỚI
1. Thêm model vào `prisma/schema.prisma` → `npx prisma db push` (SQLite) → có thể thêm vào `seed.ts`.
2. Thêm `getXxx()` vào `components/db.ts`.
3. Thêm API route `app/api/xxx/route.ts` (GET/POST/PATCH/DELETE theo mẫu có sẵn).
4. Tạo `components/CreateXxxForm.tsx` + `CreateXxxModal.tsx` (theo mẫu CreateContent*).
5. Tạo `/new` page + trang danh mục dùng `PageShell` + component bảng.
6. Thêm vào `sidebar.tsx` navItems nếu cần.
7. Đảm bảo status/toneOf/STATUSES đúng chuỗi tiếng Việt.
8. Chạy `npm run build` để check type/lint.

---

## 13. ĐĂNG NHẬP & PHÂN QUYỀN (RBAC) — ĐÃ CÓ, đọc kỹ

### Kiến trúc bảo vệ (2 lớp)
1. **`middleware.ts`** (edge): chặn `/dashboard/*` và `/api/*` nếu chưa đăng nhập → redirect về `/login`. Đường dẫn công khai: `/login`, `/api/auth/*`, `/api/health`, `/forbidden`.
2. **Guard theo quyền (per-feature):**
   - Trang **server component**: gọi `await requirePerm("key")` từ `@/lib/guard` (chưa login → `/login`, thiếu quyền → `/forbidden`).
   - Trang **"use client"** (Content Studio, Settings): bọc `<ClientGuard perm="key">`.
   - **Route API**: mỗi handler ghi (POST/PATCH/PUT/DELETE...) gọi `requirePermApi("key")`; nếu thiếu quyền trả 403. (GET chủ yếu vẫn cần login qua middleware.)

### Quyền theo chức năng + thao tác (CRUD) — `lib/permissions.ts`
Quyền = `module_action`. Riêng **"Xem" giữ key = tên module** (vd `content`); các thao tác còn lại là `{module}_{create|update|delete}`.
- vd: **Content Manager** → `content` (xem), `content_create` (thêm), `content_update` (sửa), `content_delete` (xoá).
- Trang (view) dùng `requirePerm("module")`; API ghi dùng `requirePermApi("module_action")` ở đầu từng handler mutable.
- `PERMISSION_GROUPS` (nhóm theo chức năng, kèm label tiếng Việt) → dùng cho UI gán quyền; `ALL_PERMISSIONS` là mảng phẳng.
- Admin: `role="Admin"` hoặc `permissions` chứa `"*"` → toàn quyền (`canAccess`).
- User lưu `permissions` dạng JSON string `"[\"content_create\",...]"` trên cột `User.permissions`.

### Mô hình dữ liệu User
- Bắt buộc: `passwordHash` (scrypt `salt:hash`), `active Boolean`, `permissions String`.
- `lib/password.ts`: `hashPassword(pw)` / `verifyPassword(pw, stored)`.
- `lib/auth.ts`: NextAuth `authOptions` (JWT strategy, CredentialsProvider, gọi Prisma), `getCurrentUser()`.
- `app/api/users/route.ts`: chỉ admin — GET list, POST tạo, PATCH sửa (quyền/role/active/đổi mật khẩu), DELETE (không xoá chính mình).

### Tài khoản demo (seed)
- Admin: `admin@company.vn` / `admin123` (toàn quyền `["*"]`)
- Nhân viên: `hung@company.vn`, `tuan@company.vn`, `trang@company.vn`, `nam@company.vn` / `123456` (thiếu `campaigns`, `settings`, `users`)

### Checklist khi THÊM trang/chức năng MỚI (quan trọng)
1. Thêm module + các thao tác vào `PERMISSION_GROUPS` trong `lib/permissions.ts` (label tiếng Việt); `ALL_PERMISSIONS`/`DEFAULT_PERMISSIONS` tự sinh.
2. Trang server: bọc hàm bằng `await requirePerm("module")` (quyền Xem); trang client: bọc `<ClientGuard perm="module">`.
3. Route API ghi dữ liệu: gọi `requirePermApi("module_create"|"module_update"|"module_delete")` ở đầu mỗi handler mutable.
4. Thêm mục menu vào `sidebar.tsx` navItems kèm trường `perm` (menu tự ẩn theo quyền).
5. Không quên **seed/migrate** sau khi thêm cột Prisma.

---

## 14. CHẾ ĐỘ SÁNG + RESPONSIVE (đã có)
- **Chế độ sáng:** biến CSS `html.light { ... }` override trong `globals.css` (đảo `--bg/--panel/--text/...`). Bọc `<ThemeProvider attribute="class" defaultTheme="dark">` (next-themes) trong `app/layout.tsx`; nút đổi chủ đề ☀️/🌙 ở header. `.glass` dùng `color-mix(var(--panel))` để tự theo theme.
- **Responsive:** `components/layout.tsx` là client, quản lý drawer. `main` chỉ có `lg:ml-[245px]`. `sidebar.tsx` là **drawer** trên mobile (ẩn bằng `-translate-x-full`, mở khi `open`, có backdrop; desktop `lg:translate-x-0` luôn hiện). Header có nút hamburger ☰ (`lg:hidden`) + nút **Đăng xuất** (luôn hiển thị).
- **Header** hiện tên/role từ `useSession()`, nút Đăng xuất `signOut({callbackUrl:"/login"})`.

---
## 15. CÂU LỆNH BẮT BUỘC SAU KHI THÊM CỘT PRISMA / ĐỔI SCHEMA
- `npx prisma generate` (tự chạy khi `npm install` qua postinstall) — **thiếu bước này sẽ lỗi TS** vì client cũ không biết cột mới.
- Thêm cột vào DB: `npx prisma db push` (SQLite hoặc SQL Server), rồi nếu cần dữ liệu demo: `npm run db:seed` (⚠️ xoá hết data hiện có).
- Đăng nhập cần `NEXTAUTH_SECRET` (đặt giá trị dài ngẫu nhiên trong `.env`) + `NEXTAUTH_URL=http://localhost:3000`.
- Sau bất kỳ thay đổi: **khởi động lại `npm run dev`**.

---

*File tổng hợp toàn bộ source. Khi source thay đổi đáng kể, nên cập nhật lại AI_CONTEXT.md.*
