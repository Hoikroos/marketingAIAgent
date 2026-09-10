# HƯỚNG DẪN DEPLOY FREE: Render + Neon Postgres

## Bước 1 — Tạo database Neon Postgres (free, không cần thẻ)
1. Vào https://neon.tech → **Sign up** (đăng nhập bằng GitHub cho nhanh).
2. Tạo project mới (đặt tênVD: `marketing-agent`), chọn region gần VN nhất: `Singapore`.
3. Vào **Dashboard** → tìm mục **Connection string** → nhấn **Copy**.
   - Chuỗi có dạng: `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
4. Mở file `.env` ở thư mục dự án, **dán chuỗi vừa copy** vào `DATABASE_URL`.

## Bước 2 — Tạo schema (cấu trúc bảng) trên Neon
Chạy trong thư mục dự án:
```powershell
npx prisma db push
```
(Nó sẽ tạo toàn bộ bảng trên Neon. Nếu báo lỗi URL → kiểm tra lại bước 1.4)

## Bước 3 — Deploy lên Render (free, không cần thẻ)
1. Vào https://render.com → **Sign up with GitHub** → cho phép truy cập repo `Hoikroos/marketingAIAgent`.
2. Dashboard → **New +** → **Web Service** → chọn repo `marketingAIAgent`.
3. Điền cấu hình:
   - **Language/Presets**: chọn preset **Node**
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
4. Kéo xuống mục **Environment Variables** → thêm các biến (mục 4).

## Bước 4 — Khai báo biến môi trường trên Render
| Key | Value |
|---|---|
| `DATABASE_URL` | Connection string Neon (bước 1.3) |
| `NEXTAUTH_URL` | URL Render của bạn, VD `https://marketingaiagent.onrender.com` |
| `NEXTAUTH_SECRET` | Chuỗi ngẫu nhiên dài (sinh bằng lệnh dưới) |
| `GROQ_API_KEY` | Key GROQ (tuỳ chọn — có thể nhập sau trong Cài đặt hệ thống) |

Sinh `NEXTAUTH_SECRET`:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. Nhấn **Create Web Service** → đợi build ~3-5 phút.
6. Mở URL Render → đăng nhập thử. URL dashboard: `https://<ten-app>.onrender.com/dashboard`

## ⚠️ Những điều cần biết với gói Render Free
- App **tự tắt sau 15 phút không có truy cập** → lần vào tiếp theo chậm 30–60 giây (trang có thể hiện lỗi một lúc, chỉ cần F5). Uptime miễn phí đạt được nếu có người dùng thường xuyên trong giờ làm việc.
- **File upload (ảnh chat, avatar, logo, file báo cáo) bị MẤT khi app restart/redeploy** — vì đĩa free là tạm thời. Database (Neon) vẫn giữ an toàn 100%.
- Mỗi lần `git push` lên GitHub → Render **tự động deploy lại**.
- Logs để debug: Dashboard Render → tab **Logs**.

## Khi nào cần nâng cấp?
Nếu cần upload bền vững + chạy 24/7: chuyển sang **Oracle Cloud Always Free VM** (hướng dẫn riêng) hoặc trả phí ~$7/tháng (Render Starter).
