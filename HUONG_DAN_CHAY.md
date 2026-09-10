# Hướng dẫn chạy dự án

## 1. Yêu cầu
- Node.js 18+ (khuyến nghị 20+)
- Không cần cài SQL Server — dự án đã chuyển sang **SQLite** tự khởi tạo, chạy được ngay trên máy bạn.

## 2. Cài đặt & khởi tạo (chỉ cần làm 1 lần)

```bash
npm install
npm run setup
```

Lệnh `npm run setup` sẽ tự động:
1. Sinh Prisma Client (`prisma generate`)
2. Tạo database SQLite tại `prisma/dev.db` (`prisma db push`)
3. Nạp dữ liệu mẫu: dự án, trend, content, lead, campaign, workflow, task... (`prisma db seed`)

> Nếu `npm install` đã tự chạy `postinstall` sinh Prisma Client, bạn có thể chỉ cần:
> `npx prisma db push && npx prisma db seed`

## 3. Chạy dự án

```bash
npm run dev
```

Mở trình duyệt tại: **http://localhost:3000/dashboard**

## 4. Những gì đã được sửa/nâng cấp trong bản này

- Chuyển database từ SQL Server sang SQLite tự chứa — không phải cài đặt gì thêm, chạy được ngay.
- Thiết kế lại toàn bộ giao diện: theme tối sang trọng (navy + tím + vàng đồng), thêm hiệu ứng, khắc phục lỗi mất style ô nhập liệu.
- Toàn bộ nút bấm trong hệ thống đã được nối với API thật:
  - Thêm/sửa/xoá: Dự án, Lead, Chiến dịch, Content, Workflow, Công việc (Task)
  - Đổi trạng thái Lead, Content, Chiến dịch, Workflow, Task ngay trên giao diện
  - Tìm kiếm toàn hệ thống (header), lọc theo nền tảng/trạng thái ở Content & Trend Radar
  - Trang chi tiết dự án (`/dashboard/products/[id]`)
  - AI Content Studio: sinh hook/kịch bản/caption/hashtag bằng bộ AI nội bộ (không cần OpenAI key), lưu thẳng vào Content Manager
  - Trang Báo cáo: xuất file CSV thật, chọn khoảng thời gian
  - Trang Cài đặt: lưu cấu hình thật vào database
  - Content Calendar: hiển thị lịch theo tuần từ dữ liệu content thật, điều hướng tuần trước/sau
  - Hệ thống thông báo Toast cho mọi thao tác thành công/thất bại

## 5. Nếu muốn dùng SQL Server thật khi triển khai production

1. Mở `prisma/schema.prisma`, đổi `provider = "sqlite"` thành `provider = "sqlserver"`
2. Trong `.env`, dùng chuỗi kết nối SQL Server (mẫu có sẵn dạng comment trong file `.env`)
3. Vì SQL Server hỗ trợ kiểu `Decimal`, bạn có thể đổi lại `priceMin`/`priceMax` trong schema từ `Float` sang `Decimal @db.Decimal(18,2)` nếu muốn độ chính xác tuyệt đối cho tiền tệ.
4. Chạy lại `npx prisma generate && npx prisma db push`

## 6. Cấu hình n8n / AI ngoài (tuỳ chọn)

- Vào **Cài đặt hệ thống** trong app để nhập Webhook n8n hoặc OpenAI API Key.
- Nếu không cấu hình, hệ thống vẫn hoạt động đầy đủ nhờ bộ **AI Content Generator nội bộ** (tạo hook/kịch bản/caption dựa trên rule + biến hoá theo chủ đề).
