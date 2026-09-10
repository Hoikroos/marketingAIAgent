"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const tooltipStyle = {
  background: "var(--panel2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export function PerformanceChart({ data }: { data?: { d: string; views: number; eng: number; leads: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 grid place-items-center rounded-xl bg-[var(--panel)] text-xs text-slate-400">
        Chưa có số liệu social để vẽ biểu đồ — hãy nhập số liệu ở trang Trạng thái mạng xã hội.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" />
        <XAxis dataKey="d" stroke="#71839a" fontSize={11} />
        <YAxis stroke="#71839a" fontSize={11} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="views" name="Lượt xem" stroke="#a78bfa" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="eng" name="Tương tác" stroke="#38bdf8" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="leads" name="Leads" stroke="#34d399" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ReportChart({ data }: { data?: { d: string; views: number; eng: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 grid place-items-center rounded-xl bg-[var(--panel)] text-xs text-slate-400">
        Chưa có số liệu để vẽ biểu đồ.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" />
        <XAxis dataKey="d" stroke="#71839a" fontSize={11} />
        <YAxis stroke="#71839a" fontSize={11} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="views" name="Lượt xem" fill="#7c5cff" radius={[4, 4, 0, 0]} />
        <Bar dataKey="eng" name="Tương tác" fill="#38bdf8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
