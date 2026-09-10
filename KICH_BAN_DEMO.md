# 🎬 KỊCH BẢN DEMO ĐẦY ĐỦ & CHI TIẾT — AI Real Estate Marketing Platform
### (Bản đầy đủ, hướng dẫn từng bước cho người dùng — kể cả người mới)

> 📌 **Tài liệu này dùng để làm gì?**
> Đây là **sổ tay "cầm tay chỉ việc"** — mô tả CHÍNH XÁC từng bước: **vào đâu, bấm gì,
> điền gì, rồi màn hình hiện ra gì**, để bạn hoặc người trình chiếu có thể:
> - Tự chạy demo cho khách hàng/sếp mà không lúng túng.
> - Hiểu hệ thống thực sự làm được gì và giải thích lại cho người khác.
>
> 💡 Mẹo đọc: phần **"👉 BẤM"** = thao tác cụ thể; phần **"🖥️ KẾT QUẢ"** = điều bạn phải thấy được
> trên màn hình (nếu không thấy thì xem mục "❌ Lỗi / Mẹo" cuối mỗi phần).

---

## 1. ĐẦU TIÊN, HỆ THỐNG NÀY GIÚP GÌ? (NÓI CHUYỆN VỚI KHÁCH HÀNG)

Hãy tưởng tượng team marketing bất động sản của bạn mỗi ngày phải:
1. **Theo dõi** xem dân tình đang quan tâm gì (xu hướng).
2. **Viết** hàng loạt bài đăng, kịch bản video, caption, hashtag.
3. **Sắp lịch** đăng bài đều đặn, theo dõi chiến dịch.
4. **Chốt** khách hàng tiềm năng từ nội dung đó.

Nền tảng này **gộp cả 4 việc vào một hệ thống duy nhất**, dùng AI để tự viết nội dung
và quét xu hướng, còn dữ liệu thì **lưu thật** (không phải bản mô phỏng).

**Vòng tròn công việc tự động:**
```
Theo dõi TREND → AI viết CONTENT → Lên LỊCH đăng → Quản lý CAMPAIGN
        ↑                                              │
        │                                              ▼
  Gợi ý AI + BÁO CÁO  ←  Xem hiệu quả  ←  CHỐT LEAD (khách hàng)
```

**3 lời hứa chính** (nên đọc to khi demo):
- 🧠 **AI tự làm phần "nhàm chán"**: quét trend, viết content, gợi ý insight.
- 📊 **Mọi thứ hiển thị số liệu thật**: KPI, biểu đồ, báo cáo xuất CSV.
- 🔐 **Phân quyền rõ ràng**: Admin quản ai được vào chức năng nào; kẻ truy cập trái phép bị chặn.

---

## 2. HỆ THỐNG CÓ NHỮNG MÀN HÌNH NÀO? (BẢNG TRA NHANH)

Từ menu bên trái, hệ thống có **16+ phân hệ**:

| # | Màn hình (menu) | Làm được gì | Ai vào được? |
|---|---|---|---|
| 1 | **Bảng điều khiển** | Tổng quan KPI, trend nóng, content mới, chiến dịch | Mọi người |
| 2 | **Radar xu hướng** | Quét chủ đề hot, bấm "Phân tích BĐS" | Mọi người |
| 3 | **Studio nội dung AI** | Gõ chủ đề → AI sinh hook/kịch bản/caption/hashtag | Mọi người |
| 4 | **Lịch nội dung** | Lịch đăng theo tuần | Mọi người |
| 5 | **Quản lý nội dung** | Kho bài viết: Ý tưởng → Chờ duyệt → Đã đăng | Mọi người |
| 6 | **Chiến dịch** | Tạo/theo dõi chiến dịch gắn dự án | Admin |
| 7 | **Sản phẩm / Dự án** | Danh mục dự án BĐS đang bán | Mọi người |
| 8 | **Phân tích MXH** | Biểu đồ hiệu quả theo nền tảng | Mọi người |
| 9 | **Khách hàng tiềm năng** | Lead từ content; đổi trạng thái, phân công, **xoá** | Mọi người |
| 10 | **Gợi ý AI** | Insight cơ hội/cảnh báo; nút "Tạo bằng AI" | Mọi người |
| 11 | **Cộng tác nhóm** | Giao việc, theo dõi task của cả nhóm | Mọi người |
| 12 | **Quy trình tự động (n8n)** | Luồng tự động: Trend → AI → Đăng bài; **xoá workflow** | Mọi người |
| 13 | **Báo cáo** | Xuất CSV theo khoảng thời gian | Mọi người |
| 14 | **Báo cáo công việc** | Giao/nộp file báo cáo tuần, tháng | Admin + nhân viên |
| 15 | **Cài đặt hệ thống** | Cấu hình thương hiệu, AI, n8n | **Chỉ Admin** |
| 16 | **Quản lý tài khoản** | Tạo user, phân vai trò, cấp quyền, khoá, đổi mật khẩu | **Chỉ Admin** |
| 17 | **Lịch sử hoạt động** | Xem ai làm gì, lúc nào | **Chỉ Admin** |
| 18 | **Thông báo** | Tin thông báo chung/riêng | Mọi người |

> 🔐 **Quy tắc phân quyền:** Admin thấy tất cả. Nhân viên mặc định **không vào được**
> Chiến dịch, Cài đặt, Quản lý tài khoản, Lịch sử hoạt động — nếu gắng truy cập URL trực tiếp
> sẽ bị đưa sang trang **"Không có quyền"** (403).

---

## 3. CHUẨN BỊ MÁY & CHẠY HỆ THỐNG (CHỈ LÀM 1 LẦN)

### 3.1. Máy cần gì?
- **Node.js 18 trở lên** (khuyến nghị 20+).
- **Không cần cài SQL Server** — hệ thống tự tạo database SQLite khi chạy.

### 3.2. Cài đặt lần đầu (mở Terminal trong thư mục dự án)
```bash
npm install        # tải toàn bộ thư viện (lần đầu hơi lâu)
npm run setup      # tự sinh client + tạo DB + nạp dữ liệu mẫu tiếng Việt
```

Lệnh `npm run setup` làm giúp bạn 3 việc:
1. `prisma generate` — chuẩn bị mã truy cập database.
2. `prisma db push` — tạo file database `prisma/dev.db`.
3. `prisma db seed` — **nạp dữ liệu demo**: admin, nhân viên, dự án, trend, content, lead, campaign, workflow, task...

> ⚠️ Lưu ý: chạy lại `npm run setup` sẽ **XÓA SẠCH dữ liệu hiện có** và nạp lại mẫu ban đầu.

### 3.3. Bật hệ thống
```bash
npm run dev
```
Mở trình duyệt gõ: **http://localhost:3000/dashboard**

> Nếu bạn bị đẩy về trang đăng nhập, nghĩa là chưa đăng nhập — sang bước tiếp theo.

### 3.4. Giao diện sáng / tối
- Mặc định hệ thống bật **giao diện SÁNG**.
- Muốn tối thì bấm nút **☀️/🌙** (góc phải trên cùng của thanh header).

---

## 4. ĐĂNG NHẬP

### 4.1. Tài khoản dùng để demo

| Vai trò | Email | Mật khẩu | Vào được tất cả? |
|---|---|---|---|
| **Admin** | `marketing@company.vn` | `admin123` | ✅ Có (toàn quyền) |
| Nhân viên Marketing | `hung@company.vn` | `123456` | ❌ Không (bị chặn chiến dịch/cài đặt/tài khoản) |
| Nhân viên Content | `trang@company.vn` | `123456` | ❌ như trên |
| Nhân viên Video | `tuan@company.vn` | `123456` | ❌ như trên |
| Nhân viên Sales | `nam@company.vn` | `123456` | ❌ như trên |

### 4.2. Các bước đăng nhập
👉 **BẤM**: gõ email `marketing@company.vn` → bấm nút bên cạnh → nhập mật khẩu `admin123` → **Đăng nhập**.
🖥️ **KẾT QUẢ**: đưa vào màn hình **Bảng điều khiển**, thanh trái hiện đầy đủ menu.

> 💬 **Câu nói demo:** *"Đây là tài khoản quản trị — thấy đủ hết menu. Lát nữa tôi đổi qua tài
> khoản nhân viên để cho thấy giao diện 'co lại' và bị chặn ở vài chỗ."*

### 4.3. Thử nghiệm phân quyền (điểm nhấn đẹp)
👉 **BẤM**: avatar góc phải → **Đăng xuất** → đăng nhập lại bằng `trang@company.vn` / `123456`.
🖥️ **KẾT QUẢ**: menu **không còn** các mục Chiến dịch, Cài đặt, Quản lý tài khoản, Lịch sử hoạt động.
👉 **BẤM THỬ**: gõ thẳng URL `http://localhost:3000/dashboard/campaigns`.
🖥️ **KẾT QUẢ**: bị đưa sang trang **"Không có quyền" (403)** — rất ấn tượng khi demo bảo mật.

> 💬 **Câu nói demo:** *"Phân quyền theo từng người, từng chức năng. Dù biết địa chỉ trang, người
> không được phép vẫn không vào được."*

---

> **Từ phần này trở đi:** đăng nhập lại bằng tài khoản **Admin** (`marketing@company.vn`)
> để thấy đủ mọi chức năng. Mỗi màn hình theo 3 khối: **👉 BẤM** · **🖥️ KẾT QUẢ** · **💬 LỜI THUYẾT MINH**.

## 5. MÀN HÌNH 1 — BẢNG ĐIỀU KHIỂN (DASHBOARD)

👉 **BẤM**: menu trái → **Bảng điều khiển** (hoặc sau khi đăng nhập sẽ tự ở đây).
🖥️ **KẾT QUẢ**: một màn hình tổng quan với:
- **KPI phía trên**: tổng trend, tổng content, tổng lead, tổng campaign, tổng task...
- **Danh sách trend đang hot**, bài content mới nhất, chiến dịch đang chạy, việc nhóm cần làm.

> 💬 **Lời thuyết minh:** *"Chỉ một màn hình là sếp nhìn thấy toàn cảnh công ty đang chạy
> marketing thế nào — bao nhiêu nội dung, bao nhiêu khách tiềm năng, đang có trend gì."*

> 💡 **Mẹo:** mỗi con số KPI đều là dữ liệu **thật trong database**, muốn tăng/giảm thì sang
> đúng màn hình tương ứng để thêm dữ liệu, quay lại đây sẽ thấy đổi.

---

## 6. MÀN HÌNH 2 — RADAR XU HƯỚNG (TREND)

Màn hình này đóng vai **"cánh tay radar"** quét mạng xã hội để tìm chủ đề đang nóng.

👉 **BẤM**: menu trái → **Radar xu hướng**.
🖥️ **KẾT QUẢ**: danh sách các trend (đã có sẵn dữ liệu mẫu), mỗi trend có:
- Tên chủ đề + tỷ lệ tăng (vd: "Nhà dưới 4 tỷ" tăng 182%).
- Nguồn (YouTube/TikTok/Facebook) và loại.

### 6.1. Thu thập trend thật & phân tích BĐS
👉 **BẤM**: nút **"Thu thập mới"** (góc phải) → hệ thống gọi nguồn trend (GROQ/Google Trends nếu cấu hình).
🖥️ **KẾT QUẢ**: danh sách trend được thêm mới, có số liệu tăng trưởng.

👉 **BẤM**: vào một trend (vd "Nhà dưới 4 tỷ") → nút **"Phân tích BĐS"**.
🖥️ **KẾT QUẢ**: AI phân tích chủ đề đó phù hợp với phân khúc bất động sản nào, gợi ý góc khai thác.

> 💬 **Lời thuyết minh:** *"Thay vì cả team ngồi lướt mạng xã hội tìm ý tưởng, hệ thống tự quét
> và chỉ ra xu hướng đang lên — đội content chỉ việc bám theo."*

---

## 7. MÀN HÌNH 3 — STUDIO NỘI DUNG AI (VIẾT BÀI TỰ ĐỘNG)

Đây là "trái tim" — nơi AI viết nội dung tiếp thị.

### 7.1. Sinh nội dung bằng AI
👉 **BẤM**: menu trái → **Studio nội dung AI**.
👉 **ĐIỀN** các ô:
- **Chủ đề / Dự án**: chọn hoặc gõ vd "Chung cư mini Thanh Xuân".
- **Nền tảng / Loại**: video TikTok, bài Facebook, tin đăng...
- **Giọng điệu**: thân thiện / chuyên nghiệp / kích thích.
- **Độ dài**: ngắn / trung bình / dài.
- **Mục tiêu**: thu lead, tăng nhận diện...
👉 **BẤM**: nút **"Tạo nội dung"** (màu tím).
🖥️ **KẾT QUẢ**: AI hiện ra đầy đủ:
- **Hook** (câu mở hút người xem), **kịch bản** từng cảnh/đoạn, **caption**, **hashtag** gợi ý.

> 💬 **Lời thuyết minh:** *"Gõ vài từ, 10 giây sau AI viết xong bộ nội dung hoàn chỉnh: câu mở,
> kịch bản, chú thích, hashtag. Nhân viên chỉ cần chỉnh tay cho hợp gu."*

### 7.2. Lưu nội dung vào kho
👉 **BẤM**: nút **Lưu** → chọn dự án liên quan (nếu có) → **Xác nhận**.
🖥️ **KẾT QUẢ**: thông báo "Đã lưu" và bài xuất hiện ở màn hình **Quản lý nội dung** với trạng thái **"Ý tưởng"**.

> 💡 Ghi chú: hệ thống có **AI nội bộ** nên chạy được ngay cả khi chưa có key OpenAI/GROQ.
> Muốn AI "thông minh hơn", nhập key GROQ ở **Cài đặt hệ thống** (phần AI & n8n).

---

## 8. MÀN HÌNH 4 — QUẢN LÝ NỘI DUNG (KHO BÀI VIẾT)

👉 **BẤM**: menu trái → **Quản lý nội dung**.
🖥️ **KẾT QUẢ**: bảng danh sách mọi bài content, có ô tìm kiếm theo từ khoá.

### 8.1. Quản lý trạng thái bài viết
Mỗi bài có thể đổi trạng thái để đội duyệt theo quy trình:
- **Ý tưởng** → **Chờ duyệt** → **Đã đăng** (và **Nháp**).
👉 **BẤM**: đổi trạng thái ngay trên ô trạng thái của từng bài.
🖥️ **KẾT QUẢ**: trạng thái đổi màu tương ứng, thay đổi được lưu ngay.

### 8.2. Thêm nội dung thủ công & xoá
👉 **BẤM**: nút **Thêm nội dung** → điền tiêu đề, mô tả, chọn dự án → **Lưu**.
👉 **BẤM**: nút 🗑 (xoá) trên bài bất kỳ → xác nhận hộp thoại.
🖥️ **KẾT QUẢ**: bài được thêm/xoá ngay trong danh sách.

> 💬 **Lời thuyết minh:** *"Đây là 'kho' toàn bộ nội dung. Có quy trình Ý tưởng → Chờ duyệt →
> Đã đăng để kiểm soát bài nào được đưa lên."

---

## 9. MÀN HÌNH 5 — LỊCH NỘI DUNG (LỊCH ĐĂNG BÀI)

👉 **BẤM**: menu trái → **Lịch nội dung**.
🖥️ **KẾT QUẢ**: lịch dạng tuần, hiện bài nào đã có sẵn và dự kiến đăng ngày nào.

> 💬 **Lời thuyết minh:** *"Nhìn lịch là biết tuần này đăng gì, ngày nào còn trống để bổ sung —
> tránh đăng dồn dập một ngày rồi mấy ngày trống."*

---

## 10. MÀN HÌNH 6 — SẢN PHẨM / DỰ ÁN

👉 **BẤM**: menu trái → **Sản phẩm / Dự án**.
🖥️ **KẾT QUẢ**: danh sách dự án bất động sản đang bán (tên, vị trí, giá từ/đến, loại, trạng thái).

### 10.1. Tạo dự án mới
👉 **BẤM**: **Thêm dự án** → điền:
- Tên dự án (bắt buộc), vị trí, loại (Chung cư/Nhà phố/Đất nền...).
- Giá từ → giá đến (đơn vị **tỷ**), mô tả, ảnh.
👉 **BẤM**: **Lưu**.
🖥️ **KẾT QUẢ**: dự án xuất hiện trong danh sách.

### 10.2. Xem chi tiết, sửa, xoá
👉 **BẤM**: vào tên dự án → xem trang chi tiết gồm các nội dung, chiến dịch, lead liên quan.
👉 **BẤM**: nút **Sửa** / **Xoá** (có xác nhận).

> 💬 **Lời thuyết minh:** *"Mọi nội dung AI viết ra đều có thể gắn vào một dự án cụ thể, để
> sau này xem trend, bài viết, khách hàng của từng dự án gom lại một chỗ."*

---

## 11. MÀN HÌNH 7 — CHIẾN DỊCH (ĐIỂM NHẤN CỦA ADMIN)

> 🔐 Màn hình này **chỉ Admin** vào được (nhân viên nhìn thấy trang "Không có quyền").

👉 **BẤM**: menu trái → **Chiến dịch**.
🖥️ **KẾT QUẢ**: danh sách chiến dịch kèm trạng thái (Đang chạy / Tạm dừng / Sắp tới).

### 11.1. Tạo chiến dịch
👉 **BẤM**: **Tạo chiến dịch** → điền:
- **Tên** (bắt buộc), **thời gian bắt đầu – kết thúc**, **gắn dự án** (tuỳ chọn).
👉 **BẤM**: **Tạo**.
🖥️ **KẾT QUẢ**: chiến dịch mới xuất hiện trong danh sách.

### 11.2. Đổi trạng thái chiến dịch
👉 **BẤM**: công tắc trạng thái trên từng chiến dịch.
🖥️ **KẾT QUẢ**: chiến dịch chuyển Đang chạy ↔ Tạm dừng, tính tiến độ cập nhật.

> 💬 **Lời thuyết minh:** *"Có thể theo dõi từng chiến dịch chạy cho dự án nào, kéo dài bao lâu,
> đang dừng hay đang chạy — sếp nắm được ngân sách & tiến độ từng đợt."*

---

## 12. MÀN HÌNH 8 — PHÂN TÍCH MẠNG XÃ HỘI

👉 **BẤM**: menu trái → **Phân tích mạng xã hội**.
🖥️ **KẾT QUẢ**: các **biểu đồ** về hiệu quả theo nền tảng (views, tương tác, lead),
kèm số liệu tổng quan. Nếu chưa có dữ liệu mới, hệ thống vẫn vẽ biểu đồ với **dữ liệu mẫu**.

> 💬 **Lời thuyết minh:** *"Biểu đồ giúp biết nền tảng nào đang chạy tốt để tập trung ngân sách —
> í &#x1F4C8; nhiều hơn là đoán."*

---

## 13. MÀN HÌNH 9 — KHÁCH HÀNG TIỀM NĂNG (LEADS)

👉 **BẤM**: menu trái → **Khách hàng tiềm năng**.
🖥️ **KẾT QUẢ**: bảng lead (tên, SĐT, nguồn, dự án, người phụ trách, trạng thái, ngày tạo).

### 13.1. Tạo lead thủ công
👉 **BẤM**: **Thêm khách hàng** → điền **họ tên + SĐT** (bắt buộc), nguồn, dự án, người phụ trách → **Lưu**.
🖥️ **KẾT QUẢ**: lead mới xuất hiện trong bảng.

### 13.2. Đổi trạng thái (quy trình chốt khách)
👉 **BẤM**: đổi ô trạng thái của một lead: **Mới → Đang tư vấn → Đã chốt** (hoặc Không tiềm năng).
🖥️ **KẾT QUẢ**: trạng thái đổi màu tức thì, lưu vào database.

### 13.3. Phân công người phụ trách
👉 **BẤM**: ô **Phụ trách** → chọn nhân viên (hoặc bỏ trống = chưa gán).
🖥️ **KẾT QUẢ**: lead chuyển cho nhân viên; nếu bật ở Cài đặt, nhân viên đó sẽ **nhận thông báo**.

### 13.4. Xoá lead
👉 **BẤM**: nút 🗑 ở cột **Thao tác** → hộp thoại xác nhận → **Xoá**.
🖥️ **KẾT QUẢ**: lead bị xoá khỏi hệ thống.

> 💬 **Lời thuyết minh:** *\"Mỗi bài content đăng lên kéo về khách, hệ thống gom hết thành danh
> sách lead để sales biết ai cần gọi. Đổi trạng thái theo tiến trình chốt, phân công cho từng người."*

> 💡 **Ghi chú:** nút **Xoá** chỉ hiện khi tài khoản có quyền `leads_delete` (Admin mặc định có).

---

## 14. MÀN HÌNH 10 — GỢI Ý AI (INSIGHTS)

👉 **BẤM**: menu trái → **Gợi ý AI**.
🖥️ **KẾT QUẢ**: các **insight** (gợi ý cơ hội / cảnh báo) dựa trên dữ liệu trend & content.

👉 **BẤM**: nút **"Tạo insight bằng AI"** → chọn nguồn **Dữ liệu** hoặc **AI** → **Tạo**.
🖥️ **KẾT QUẢ**: hệ thống sinh thêm gợi ý mới, vd *"Đẩy mạnh vào xu hướng đang tăng"*.

> 💬 **Lời thuyết minh:** *\"AI đọc hết dữ liệu và nhắc team: nên đổ thêm ngân sách chỗ này,
> cảnh báo chỗ kia đang hạ nhiệt — giúp ra quyết định nhanh hơn."*

---

## 15. MÀN HÌNH 11 — CỘNG TÁC NHÓM (TEAM / CÔNG VIỆC)

👉 **BẤM**: menu trái → **Cộng tác nhóm**.
🖥️ **KẾT QUẢ**: bảng **tất cả công việc của cả nhóm** (tiêu đề, giao cho ai, deadline, trạng thái, ưu tiên).

### 15.1. Giao việc mới
👉 **BẤM**: **Giao việc** → điền:
- **Tiêu đề** công việc, **giao cho** (chọn thành viên), **deadline**, **ưu tiên** (Cao/Trung bình/Thấp).
👉 **BẤM**: **Tạo**.
🖥️ **KẾT QUẢ**: công việc mới hiện trong bảng.

### 15.2. Cập nhật trạng thái
👉 **BẤM**: đổi ô trạng thái: **Chờ thực hiện → Đang thực hiện → Đã hoàn thành**.
🖥️ **KẾT QUẢ**: cột "Cập nhật lúc" đổi theo giờ, trạng thái lưu ngay.

> 💬 **Lời thuyết minh:** *\"Mọi người thấy toàn bộ việc của team để phối hợp: ai giao ai, deadline
> ngày nào, tiến độ ra sao — khỏi hỏi nhau. Trước đây chỉ thấy việc của mình, giờ xem được cả nhóm."*

---

## 16. MÀN HÌNH 12 — QUY TRÌNH TỰ ĐỘNG (WORKFLOW / n8n)

👉 **BẤM**: menu trái → **Quy trình tự động (n8n)**.
🖥️ **KẾT QUẢ**: danh sách workflow (xanh = đang chạy, vàng = chờ) + **lịch sử chạy gần nhất**.

### 16.1. Tạo workflow
👉 **BẤM**: **Tạo workflow** → nhập **tên** (vd "Trend Hunter"), mô tả → **Tạo**.
🖥️ **KẾT QUẢ**: workflow mới xuất hiện, mặc định **Đang chạy**.

### 16.2. Chạy / tạm dừng
👉 **BẤM**: nút ▶️ (chạy ngay) hoặc ⏸/▶ (bật/tắt) trên từng workflow.
🖥️ **KẾT QUẢ**: số lần chạy (`executions`) tăng, thời gian chạy ghi vào lịch sử.

### 16.3. Xoá workflow

---

# 🧭 PHỤ LỤC MỞ RỘNG (BỔ SUNG CHO BẢN ĐẦY ĐỦ)

## A. MỤC LỤC NHANH

1. [Hệ thống giúp gì?](#1-đầu-tiên-hệ-thống-này-giúp-gì-nói-chuyện-với-khách-hàng)
2. [Bảng tra 18 màn hình](#2-hệ-thống-có-những-màn-hình-nào-bảng-tra-nhanh)
3. [Chuẩn bị máy & chạy](#3-chuẩn-bị-máy--chạy-hệ-thống-chỉ-làm-1-lần)
4. [Đăng nhập & phân quyền](#4-đăng-nhập)
5–19. [Đi từng màn hình](#5-màn-hình-1--bảng-điều-khiển-dashboard)
20. [Kịch bản trình diễn trọn gói](#20-kịch-bản-trình-diễn-trọn-gói-1015-phút--nói-gì-bấm-gì)
21. [Khắc phục sự cố](#21-vận-hành--khắc-phục-sự-cố-nhanh)
22. [Checklist](#22-checklist-trước-khi-demo)

---

## B. TỪ VỰNG / THUẬT NGỮ (DÀNH CHO NGƯỜI MỚI)

| Thuật ngữ | Ý nghĩa |
|---|---|
| **Dashboard** | Bảng điều khiển – màn hình tổng quan chính |
| **Trend** | Xu hướng – chủ đề đang được quan tâm trên mạng xã hội |
| **Content** | Nội dung bài đăng (bài viết, video, caption, hashtag...) |
| **Hook** | Câu mở đầu hút người xem dừng lại |
| **Caption** | Chú thích đi kèm bài đăng |
| **Hashtag** | Thẻ # giúp bài tiếp cận đúng nhóm người quan tâm |
| **Campaign** | Chiến dịch marketing (một đợt quảng bá có mục tiêu) |
| **Lead** | Khách hàng tiềm năng (đã để lại thông tin) |

---

## C. KỊCH BẢN DEMO THEO VAI TRÒ

### C.1. Demo cho Sếp / Ban lãnh đạo (2–3 phút)
👉 Mở **Dashboard** → chỉ các KPI.
👉 Mở **Phân tích mạng xã hội** → chỉ biểu đồ.
👉 Mở **Báo cáo** → **Xuất CSV**.
🎯 *Thông điệp: "Thấy được toàn cảnh + có file báo cáo để báo cáo nhanh."*

### C.2. Demo cho phòng Marketing / Content (5 phút)
👉 **Studio nội dung AI** → tạo 1 bài → **Lưu**.
👉 **Quản lý nội dung** → đổi trạng thái Chờ duyệt.
👉 **Lịch nội dung** → xem ngày đăng.
👉 **Cộng tác nhóm** → giao việc, cập nhật trạng thái.
🎯 *Thông điệm: "AI viết nhanh, quản lý quy trình duyệt & lịch đăng rõ ràng."*

### C.3. Demo cho phòng Sales (3 phút)
👉 **Khách hàng tiềm năng** → đổi trạng thái Mới → Đang tư vấn → Đã chốt.
👉 Phân công người phụ trách.
👉 Nút **Xoá** khi lead không tiềm năng.
🎯 *Thông điệp: "Biết ai cần gọi, ai đang tư vấn, đã chốt bao nhiêu."*

### C.4. Demo cho Admin / Quản trị (5 phút — điểm nhấn bảo mật)
👉 **Quản lý tài khoản**: tạo user, đổi vai trò, khoá tài khoản, chỉnh quyền, đổi mật khẩu.
👉 **Lịch sử hoạt động**: chỉ ra các dòng log vừa thao tác.
👉 Đăng xuất → đăng nhập nhân viên → chỉ menu **thiếu** → thử URL `/dashboard/users` → **"Không có quyền" (403)**.
👉 Quay lại Admin → **Cài đặt hệ thống** → chỉnh thương hiệu / AI / n8n.
🎯 *Thông điệp: "Phân quyền chặt chẽ, mọi thao tác đều có dấu vết."*

---

## D. KỊCH BẢN THEO TÌNH HUỐNG NGHIỆP VỤ

### D.1. "Sắp ra mắt một dự án mới"
1. **Sản phẩm/Dự án** → Thêm dự án (có **ô diện tích** + **tải nhiều ảnh** từ máy).
2. **Radar xu hướng** → tìm chủ đề hot phù hợp.
3. **Studio nội dung AI** → viết loạt bài cho dự án.
4. **Chiến dịch** (Admin) → tạo chiến dịch gắn dự án.
5. **Cộng tác nhóm** → giao việc cho từng thành viên.

### D.2. "Content đang kéo về nhiều khách hỏi"
1. Xem **Khách hàng tiềm năng** → danh sách lead từ content.
2. Phân công từng lead cho sales.
3. Theo dõi trạng thái Mới → Đang tư vấn → Đã chốt.
4. Xoá lead không tiềm năng để danh sách sạch.

### D.3. "Sếp hỏi tuần này làm được gì"
1. **Dashboard** → tổng hợp KPI.
2. **Lịch sử hoạt động** (Admin) → chứng minh ai đã làm gì.
3. **Báo cáo** → xuất CSV gửi sếp.

---

---

# 👨‍💼 PHẦN HƯỚNG DẪN SỬ DỤNG CHO NGƯỜI DÙNG CUỐI (NÓI THEO LỐI ĐỜI THƯỜNG)

> Phần này giải thích **từng màn hình theo góc nhìn người dùng thật**: *dữ liệu từ đâu ra?*
> *khi nào mình dùng màn hình này?* *bấm gì?* *hay gặp lỗi gì?* — dành cho người không rành
> kỹ thuật, muốn tự dùng mà không cần xem code.

---

## F.1. BẢNG ĐIỀU KHIỂN
**Dữ liệu từ đâu?** Tự gom từ tất cả các màn hình khác (trend, content, lead, campaign, task).
**Khi nào dùng?** Mỗi buổi sáng mở ra để nắm nhanh tình hình.
**Bấm gì?** Chỉ xem. Muốn thay đổi số liệu thì sang màn hình tương ứng rồi quay lại F5.
**Lỗi hay gặp?** Số liệu chưa đổi sau khi thêm → nhấn **F5** tải lại.

## F.2. RADAR XU HƯỚNG
**Dữ liệu từ đâu?** Hệ thống quét mạng xã hội (hoặc lấy từ dữ liệu mẫu khi mới cài).
**Khi nào dùng?** Muốn biết dân tình đang quan tâm gì để bám theo.
**Bấm gì?** Nút **"Thu thập mới"** để quét thêm → bấm tên trend → **"Phân tích BĐS"**.
**Lỗi hay gặp?** Không có trend mới → cấu hình key AI ở Cài đặt hệ thống.

## F.3. STUDIO NỘI DUNG AI
**Dữ liệu từ đâu?** AI sinh ra, bạn chỉ nhập chủ đề.
**Khi nào dùng?** Cần bài đăng/video/kịch bản mới.
**Bấm gì?** Chọn dự án/loại/giọng/độ dài/mục tiêu → **"Tạo nội dung"** → **"Lưu"**.
**Lỗi hay gặp?** "Tạo nội dung" chậm → chờ vài giây; nếu có GROQ key đặt ở Cài đặt.

## F.4. QUẢN LÝ NỘI DUNG
**Dữ liệu từ đâu?** Từ Studio AI lưu về, hoặc tự nhập.
**Khi nào dùng?** Duyệt bài: Ý tưởng → Chờ duyệt → Đã đăng.
**Bấm gì?** Đổi trạng thái trên ô trạng thái từng bài; nút **Thêm nội dung**; nút 🗑 xoá.
**Lỗi hay gặp?** Không thấy bài vừa tạo → F5.

## F.5. LỊCH NỘI DUNG
**Dữ liệu từ đâu?** Các bài content có ngày đăng.
**Khi nào dùng?** Lên kế hoạch đăng cho cả tuần.
**Bấm gì?** Xem lịch, xác định ngày còn trống để bổ sung bài.

## F.6. SẢN PHẨM / DỰ ÁN
**Dữ liệu từ đâu?** Bạn nhập thủ công.
**Khi nào dùng?** Muốn lưu hồ sơ dự án BĐS để AI viết bài đúng chủ đề.
**Bấm gì?** **"Thêm dự án"** (tên, vị trí, loại, giá, **diện tích**, **ảnh nhiều tấm**) → bấm tên để xem chi tiết → **"Sửa dự án"** nếu nhập sai → **Xoá** nếu cần.
**Lỗi hay gặp?** Không lưu được ảnh → khởi động lại server 1 lần (thuật ngữ: `Ctrl+C` rồi `npm run dev`).

## F.7. CHIẾN DỊCH (Admin)
**Dữ liệu từ đâu?** Admin tạo.
**Khi nào dùng?** Quản lý từng đợt quảng bá theo dự án.
**Bấm gì?** **"Tạo chiến dịch"** → bật/tắt trạng thái bằng công tắc.
**Lỗi hay gặp?** Nhân viên vào bị "Không có quyền" → đúng, màn hình này chỉ Admin.

## F.8. PHÂN TÍCH MẠNG XÃ HỘI
**Dữ liệu từ đâu?** Tổng hợp lượt xem/tương tác/lead theo nền tảng.
**Khi nào dùng?** Muốn biết nền tảng nào chạy tốt để dồn ngân sách.
**Bấm gì?** Xem biểu đồ; nếu chưa có dữ liệu mới hệ thống vẫn vẽ mẫu.

## F.9. KHÁCH HÀNG TIỀM NĂNG
**Dữ liệu từ đâu?** Bạn tự nhập, hoặc từ content.
**Khi nào dùng?** Theo dõi ai cần gọi, đang tư vấn, đã chốt.
**Bấm gì?** **"Thêm khách hàng"** → đổi trạng thái (**Mới → Đang tư vấn → Đã chốt**) → chọn **Phụ trách** → nút 🗑 **Xoá** nếu không tiềm năng.
**Lỗi hay gặp?** Không thấy nút Xoá → tài khoản không có quyền `leads_delete` (dùng Admin).

## F.10. GỢI Ý AI
**Dữ liệu từ đâu?** AI đọc trend + content.
**Khi nào dùng?** Cần nhận định "nên tập trung vào đâu".
**Bấm gì?** Nút **"Tạo insight bằng AI"** → chọn Dữ liệu/AI → **Tạo**.

## F.11. CỘNG TÁC NHÓM
**Dữ liệu từ đâu?** Cả nhóm tạo.
**Khi nào dùng?** Giao việc, theo dõi tiến độ của cả team.
**Bấm gì?** **"Giao việc"** (tiêu đề, giao cho, deadline, ưu tiên) → đổi trạng thái từng việc.
**Lỗi hay gặp?** Cập nhật xong không thấy → F5; lưu ý giờ ai có quyền xem team đều thấy mọi việc.

## F.12. QUY TRÌNH TỰ ĐỘNG
**Dữ liệu từ đâu?** Các workflow bạn tạo.
**Khi nào dùng?** Cấu hình tự động: lịch quét trend → AI viết → đăng bài.
**Bấm gì?** **"Tạo workflow"** → nút ▶️ chạy / ⏸ bật-tắt → nút 🗑 **Xoá**.

## F.13. BÁO CÁO
**Khi nào dùng?** Cần file tổng kết.
**Bấm gì?** Chọn khoảng thời gian → **"Xuất CSV"**.

## F.14. BÁO CÁO CÔNG VIỆC
**Người dùng?** Admin giao, nhân viên nộp.
**Bấm gì?** Admin: **"Giao báo cáo mới"** (tuần/tháng + người) → Nhân viên: **"Nộp file"** (Word/PDF).

## F.15–F.18. CHỈ DÀNH CHO ADMIN
- **Quản lý tài khoản**: tạo user, đổi vai trò, khoá, chỉnh quyền, đổi mật khẩu, xoá.
- **Cài đặt hệ thống**: tên/màu công ty, slogan, SĐT/email, AI key, webhook n8n, thông báo.
- **Lịch sử hoạt động**: tra cứu "ai làm gì, lúc nào" — có ô tìm kiếm & phân trang.
- **Thông báo**: xem tin chung/riêng.
- **Mẹo chung (Admin):** nếu muốn demo "bảo mật", đăng xuất, đăng nhập tài khoản nhân viên,
  gõ URL `/dashboard/users` → bị đưa sang trang **"Không có quyền"** — rất thuyết phục.

---

### 💡 TÓM TẮT 3 CÂU CHO NGƯỜI DÙNG MỚI
1. **Muốn có bài đăng/video mới?** → Studio nội dung AI (gõ chủ đề, bấm Tạo, bấm Lưu).
2. **Muốn quản lý khách?** → Khách hàng tiềm năng (đổi trạng thái, gán người phụ trách).
3. **Muốn biết hệ thống đang thế nào?** → Bảng điều khiển (tổng quan KPI).

> *Quy tắc vàng: gần như mọi thao tác đều có nút Xác nhận/Lưu; nếu làm sai chỉ cần sửa lại
> hoặc F5. Chỉ Admin mới chạm vào phần account/cài đặt/lịch sử hoạt động.*



## E. FAQ MỞ RỘNG

**Q. Tải ảnh dự án lên kiểu gì? Ảnh lưu ở đâu?**
Vào **Thêm dự án** → bấm **"Chọn ảnh từ máy"** (chọn được nhiều ảnh cùng lúc) → xem trước rồi *Tạo*.
Ảnh được lưu vào thư mục `public/uploads/projects` và hiển thị ngay ở trang chi tiết dạng **thumbnail**.

**Q. Ô "Diện tích" ghi thế nào?**
Ghi dạng chữ, vd: `80–120 m²` hoặc `100 m²`. Hiển thị ở danh sách và trang chi tiết dự án.

**Q. Đã tạo dự án với ảnh nhưng chưa thấy thumbnail?**
Tính năng nhiều ảnh cần **cột mới trong database**. Nếu chưa thấy, hãy **khởi động lại server** (`Ctrl+C` rồi `npm run dev`) một lần — thao tác bình thường sau khi thay đổi cơ sở dữ liệu.

**Q. Ai được phép tải ảnh dự án?**
Người có quyền `products_create` hoặc `products_update` (Admin mặc định có).

**Q. Làm sao để hệ thống quay lại dữ liệu mẫu ban đầu?**
Chạy `npm run setup` (⚠️ xoá toàn bộ dữ liệu hiện có và nạp lại mẫu).

| **Insight** | Gợi ý / phát hiện từ dữ liệu |
| **Workflow / n8n** | Quy trình tự động hoá các bước công việc |
| **KPI** | Chỉ số đo hiệu quả (lượt xem, lead, chiến dịch...) |
| **RBAC / Phân quyền** | Quy định ai được vào chức năng nào |
| **CSV** | File dạng bảng (mở bằng Excel) để xuất dữ liệu |
| **Admin** | Tài khoản quản trị – toàn quyền |
| **m²** | Mét vuông – đơn vị diện tích |

👉 **BẤM**: nút 🗑 (góc phải của workflow) → hộp thoại xác nhận → **Xoá**.
🖥️ **KẾT QUẢ**: workflow biến mất khỏi danh sách.

> 💬 **Lời thuyết minh:** *\"Ráp các bước tự động: theo lịch là quét trend, gọi AI viết bài, rồi đăng
> lên mạng xã hội. Nối được với n8n để mở rộng công việc tự động. Có nút chạy ngay và cả nút xoá."*

---

## 17. MÀN HÌNH 13 — BÁO CÁO (XUẤT FILE)

👉 **BẤM**: menu trái → **Báo cáo**.
👉 **BẤM**: chọn **khoảng thời gian** (từ ngày → đến ngày) → bấm nút **Xuất CSV**.
🖥️ **KẾT QUẢ**: tải về file CSV để gửi sếp hoặc xử lý offline.

> 💬 **Lời thuyết minh:** *\"Báo cáo chỉ cần chọn thời gian rồi xuất file, không phải tự kê tay."*

---

## 18. MÀN HÌNH 14 — BÁO CÁO CÔNG VIỆC (TUẦN / THÁNG)

> Quy trình: **Admin giao** → **nhân viên nộp file** → **Admin kiểm duyệt**.

### 18.1. Admin giao báo cáo
👉 **BẤM**: **Báo cáo công việc** → **Giao báo cáo mới** → chọn **tuần/tháng**, tiêu đề, chọn **nhân viên** → **Giao**.
🖥️ **KẾT QUẢ**: mỗi nhân viên được giao nhận một báo cáo riêng.

### 18.2. Nhân viên nộp file
👉 Đăng nhập tài khoản nhân viên → **Báo cáo công việc** → bấm **Nộp file** (Word/PDF).
🖥️ **KẾT QUẢ**: trạng thái chuyển **Đã nộp**, Admin xem/tải file về.

> 💬 **Lời thuyết minh:** *\"Quản lý giao – nộp file báo cáo gọn trong một màn hình, ai chưa nộp
> là biết ngay."*

---

## 19. CÁC MÀN HÌNH CHỈ DÀNH CHO ADMIN

> 🔐 Bốn màn hình dưới đây **chỉ Admin** vào được. Nhân viên không thấy menu, gắng truy cập
> trực tiếp URL sẽ bị trang **"Không có quyền" (403)**.

### 19.1. Quản lý tài khoản
👉 **BẤM**: menu trái → **Quản lý tài khoản**.
- **Tạo tài khoản**: nút **Thêm tài khoản mới** → điền tên, email, mật khẩu, vai trò → **Tạo**.
- **Đổi vai trò**: dropdown trong bảng (Marketing / Content Creator / Video Editor / Sales / Admin).
- **Khoá / mở khóa**: công tắc toggle — tài khoản bị khoá không đăng nhập được
  (không thể khoá tài khoản của chính mình).
- **Chỉnh quyền**: nút ⚙️ → tick/xoá tích từng chức năng (Xem / Thêm / Sửa / Xoá).
- **Đổi mật khẩu**: nút ⚙️ → **Đổi mật khẩu** (có nút 👁 hiện/ẩn).
- **Xoá tài khoản**: nút 🗑 → hộp thoại xác nhận.

> 💡 Quyền thay đổi **có hiệu lực ngay**. Vai trò **Admin** sở hữu quyền `*` = toàn quyền.

### 19.2. Cài đặt hệ thống
👉 **BẤM**: menu trái → **Cài đặt hệ thống** → các thẻ:
- **Thông tin thương hiệu**: tên công ty, màu thương hiệu, slogan, SĐT, email (hiện ở sidebar/header).
- **AI & n8n**: `n8n Webhook URL`, `GROQ API Key`, `AI Model` (để trống = dùng AI nội bộ).
- **Thông báo**: bật/tắt thông báo khi có lead phân cho nhân viên.
👉 **BẤM**: **Lưu cấu hình**.

### 19.3. Lịch sử hoạt động
👉 **BẤM**: menu trái → **Lịch sử hoạt động**.
🖥️ **KẾT QUẢ**: bảng ghi **ai, làm gì (tạo/sửa/xoá/sinh), chức năng nào, chi tiết, lúc nào**.
- Có **ô tìm kiếm** theo tên / chức năng / thao tác và **phân trang**.

> 💬 **Lời thuyết minh:** *\"Mọi hành động của từng tài khoản đều có dấu vết: ai sửa, ai xoá,
> ai sinh nội dung — tra được ngay. Chỉ Admin xem; nhân viên không vào được."*

> 🔎 **Mẹo demo:** vừa rồi bạn đã tạo/sửa/xoá vài thứ → mở **Lịch sử hoạt động** để chỉ ra
> từng dòng log tương ứng. Rất thuyết phục.

### 19.4. Thông báo
👉 **BẤM**: chuông 🔔 trên header → xem thông báo chung + riêng (vd "Lead mới được phân cho bạn").

---

## 20. KỊCH BẢN TRÌNH DIỄN TRỌN GÓI (10–15 PHÚT) — NÓI GÌ, BẤM GÌ

> Chuẩn bị: đăng nhập **Admin**, để sẵn trình duyệt. Đọc lời thoại đậm, bấm theo "BẤM".

**1. Mở đầu (0:00–0:10)** — *"Chào anh/chị. Nền tảng này giúp đội marketing bất động sản
tự động hoá cả vòng tròn: từ theo dõi xu hướng, viết nội dung, đến quản lý khách hàng."*
👉 Mở **Bảng điều khiển**.

**2. Dashboard (0:10–0:30)** — *"Một màn hình là thấy toàn cảnh: có bao nhiêu trend, nội dung,
khách hàng, chiến dịch."*

**3. Xu hướng (0:30–0:50)** — *"Đội content hết phải lướt mạng tìm ý tưởng."* 👉 **Radar xu hướng** →
chỉ trend tăng cao → bấm **Phân tích BĐS**.

**4. AI viết bài (0:50–1:30)** — *"Gõ chủ đề, bấm Tạo, 10 giây sau AI ra bộ nội dung."*
👉 **Studio nội dung AI** → gõ "Chung cư mini Thanh Xuân" → **Tạo** → **Lưu**.

**5. Kho nội dung + Lịch (1:30–2:00)** — *"Bài vừa lưu nằm ở Quản lý nội dung, đổi trạng thái
được; xem lịch tuần ở Lịch nội dung."* 👉 mở 2 màn hình đó.

**6. Dự án (2:00–2:20)** — *"Mọi thứ gắn theo dự án."* 👉 mở **Sản phẩm/Dự án**, vào 1 dự án.

**7. Khách hàng (2:20–2:50)** — *"Nội dung kéo về khách thành danh sách lead."*
👉 **Khách hàng tiềm năng** → đổi 1 lead sang **Đang tư vấn** → phân công cho nhân viên → chỉ nút 🗑 **Xoá**.

**8. Gợi ý AI (2:50–3:10)** — *"AI gợi ý nên tập trung vào đâu."* 👉 **Gợi ý AI** → **Tạo bằng AI**.

**9. Nhóm (3:10–3:30)** — *"Phối hợp công việc: giao việc, ai làm gì, deadline."*
👉 **Cộng tác nhóm** → giao 1 việc, đổi trạng thái.

**10. Workflow (3:30–3:50)** — *"Tự động hoá quy trình; có nút chạy và xoá."* 👉 **Quy trình tự động** → chạy 1 workflow.

**11. Báo cáo (3:50–4:10)** — *"Chọn thời gian, xuất CSV."* 👉 **Báo cáo** → **Xuất CSV**.

**12. Phân quyền & bảo mật (4:10–4:50, Admin)** — *"Đây là điểm mạnh. Chỉ Admin vào được
Quản lý tài khoản/Cài đặt/Lịch sử."* 👉 vào **Quản lý tài khoản** (khoe vai trò, khoá, sửa quyền)
→ **Lịch sử hoạt động** (chỉ ra log vừa tạo) → đăng xuất, đăng nhập nhân viên `trang@company.vn`,
chỉ rõ menu **thiếu** các mục admin → thử URL `/dashboard/campaigns` → bị **403**.

**13. Kết (4:50–5:00)** — *"Vòng tròn khép kín: AI lo phần việc, số liệu thật, phân quyền chặt chẽ."*
👉 quay lại **Bảng điều khiển**.

---

## 21. VẬN HÀNH & KHẮC PHỤC SỰ CỐ NHANH

| Tình huống | Nguyên nhân / Xử lý |
|---|---|
| Mở `localhost:3000` bị đẩy về đăng nhập | Chưa đăng nhập — nhập `marketing@company.vn` / `admin123` |
| Nhân viên vào Campaigns/Cài đặt/Tài khoản bị "Không có quyền" | Đúng vậy — các chức năng đó **chỉ Admin** |
| Nhấn "Tạo nội dung" chậm / không lên | Chờ vài giây; nếu có GROQ key thì đặt ở **Cài đặt hệ thống** |
| Dữ liệu mới không thấy trên Dashboard | Tải lại trang (F5) — Dashboard đọc lại database |
| Chỉnh hỏng dữ liệu demo | Chạy lại `npm run setup` để reset (⚠️ xoá hết dữ liệu cũ) |
| Muốn giao diện tối | Bấm nút 🌙 trên header (mặc định là sáng) |
| Quên xem ai thao tác gì | Vào **Lịch sử hoạt động** (Admin) — có ô tìm kiếm |

---

## 22. CHECKLIST TRƯỚC KHI DEMO

- [ ] Đã chạy `npm install` + `npm run setup` (lần đầu).
- [ ] `npm run dev` đang chạy; mở `http://localhost:3000/dashboard`.
- [ ] Đăng nhập được **Admin**.
- [ ] Trình duyệt dùng **giao diện sáng** (hoặc đã chọn theo ý).
- [ ] Đã nạp dữ liệu mẫu (thấy trend/content/lead/campaign không rỗng).
- [ ] Đóng trình duyệt **cửa sổ riêng tư / khác** sẵn để demo tài khoản nhân viên.
- [ ] Bấm thử một vòng thao tác (tạo content → đổi trạng thái → xoá lead) để "Lịch sử hoạt động" có dữ liệu.

---

*Tài liệu bám sát hành vi thật của source code. Khi code thay đổi, nên cập nhật lại theo đúng
các màn hình/menu đã mô tả.*







