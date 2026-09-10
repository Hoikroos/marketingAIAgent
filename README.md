# AI Real Estate Marketing Platform

Nền tảng Marketing AI dành cho doanh nghiệp bất động sản, xây bằng Next.js + TypeScript + Prisma + SQL Server.

## Chức năng

- Dashboard / AI Opportunity
- Trend Radar
- AI Content Studio
- Content Calendar
- Content Manager
- Campaigns
- Sản phẩm / Dự án
- Social Analytics
- Leads
- AI Insights
- Team Collaboration
- Workflow n8n
- Báo cáo
- Cài đặt hệ thống
- Prisma ORM + SQL Server
- API mẫu để tạo content và trigger n8n
- Seed dữ liệu demo tiếng Việt

## 1. Cài đặt

```bash
npm install
```

Tạo `.env` từ `.env.example`, sau đó sửa `DATABASE_URL`.

## 2. Tạo database SQL Server

Tạo database rỗng:

```sql
CREATE DATABASE AIRealEstateMarketing;
```

Sau đó:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

## 3. Chạy

```bash
npm run dev
```

Mở http://localhost:3000

## 4. n8n

Trong `.env`:

```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/ai-content
```

API `/api/automation/content` có thể gọi webhook n8n. Workflow nên nhận:
- title
- platform
- tone
- duration
- goal
- productId

Sau khi n8n xử lý AI, bạn có thể POST kết quả về database bằng API riêng.

> Bản này có UI + database schema + seed + API demo. Các connector mạng xã hội/AI thực tế cần API credentials của doanh nghiệp.
