// Loading state cho toàn bộ dashboard — hiển thị ngay khi chuyển trang
// (Next.js render skeleton này trước khi server component xong → cảm giác load nhanh và mượt)
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl skeleton" />
        <div className="space-y-2 flex-1 min-w-0">
          <div className="h-5 w-52 max-w-full rounded-lg skeleton" />
          <div className="h-3 w-80 max-w-full rounded skeleton opacity-70" />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-3 w-20 rounded skeleton" />
            <div className="h-8 w-14 rounded skeleton" />
            <div className="h-2 w-24 rounded skeleton opacity-70" />
          </div>
        ))}
      </div>

      {/* Nội dung chính */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-lg skeleton" />
          <div className="h-5 w-40 rounded skeleton" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full skeleton shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-3 w-1/2 rounded skeleton" />
                <div className="h-2 w-1/3 rounded skeleton opacity-70" />
              </div>
              <div className="h-6 w-16 rounded-lg skeleton shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}