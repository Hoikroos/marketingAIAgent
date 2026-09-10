"use client";
import { useState } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
export default function DashboardLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {/* main margin only on desktop; on mobile the sidebar is a drawer overlay */}
      <main className="min-h-screen lg:ml-[245px]">
        <Header title={title} subtitle={subtitle} onMenu={() => setNavOpen(true)} />
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
