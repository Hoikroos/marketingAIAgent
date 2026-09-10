import path from "path";
import { mkdir } from "fs/promises";

export const REPORTS_DIR = path.join(process.cwd(), "uploads", "reports");

export function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function ensureDir() {
  await mkdir(REPORTS_DIR, { recursive: true });
}