import type { Timestamp } from "firebase-admin/firestore";

export function to_kst_date_key(date: Date): string {
  const ms = date.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(ms);

  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function should_notify_today(last_notified_at: Timestamp | null, kst_date_key: string): boolean {
  if (!last_notified_at) return true;
  return to_kst_date_key(last_notified_at.toDate()) !== kst_date_key;
}
