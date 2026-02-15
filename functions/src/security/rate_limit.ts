import type { Request } from "express";
import { get_firestore } from "../ops/firestore_admin";
import { api_error } from "../shared/http_types";
import { get_trace_id } from "../shared/trace_id";

type rate_limit_args = {
  device_id: string;
  limit_per_min: number;
};

function to_bucket_key(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${min}`;
}

export async function enforce_rate_limit(req: Request, args: rate_limit_args) {
  const trace_id = get_trace_id(req);
  const db = get_firestore();

  const now = new Date();
  const bucket_key = to_bucket_key(now);
  const doc_id = `${args.device_id}_${bucket_key}`;
  const ref = db.collection("ops_rate_limits").doc(doc_id);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data()?.count as number) || 0 : 0;
    const next = current + 1;

    if (next > args.limit_per_min) {
      return { allowed: false, next };
    }

    tx.set(
      ref,
      {
        device_id: args.device_id,
        bucket_key,
        count: next,
        updated_at: now,
        expires_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
      },
      { merge: true }
    );

    return { allowed: true, next };
  });

  if (!result.allowed) {
    throw new api_error({
      code: "RATE_LIMITED",
      status: 429,
      message: `rate limited: ${result.next}/${args.limit_per_min} per min`,
      trace_id
    });
  }
}
