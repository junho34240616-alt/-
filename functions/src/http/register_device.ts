import type { Request, Response } from "express";
import { z } from "zod";
import { get_firestore } from "../ops/firestore_admin";
import { enforce_rate_limit } from "../security/rate_limit";
import { api_error } from "../shared/http_types";
import { get_trace_id } from "../shared/trace_id";

const uuid_v4_re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const register_device_schema = z.object({
  device_id: z.string().regex(uuid_v4_re),
  web_token: z.string().min(10).max(4096).optional(),
  fcm_token: z.string().min(10).max(4096).optional(),
  channels: z
    .object({
      web: z.boolean().optional(),
      fcm: z.boolean().optional()
    })
    .optional()
});

export async function register_device_handler(req: Request, res: Response) {
  const trace_id = get_trace_id(req);
  const parsed = register_device_schema.safeParse(req.body);

  if (!parsed.success) {
    throw new api_error({ code: "INVALID_ARGUMENT", status: 400, message: "invalid register_device payload", trace_id });
  }

  const { device_id, web_token, fcm_token, channels } = parsed.data;
  await enforce_rate_limit(req, { device_id, limit_per_min: 60 });

  const db = get_firestore();
  const ref = db.doc(`devices/${device_id}`);
  const now = new Date();

  await ref.set(
    {
      created_at: now,
      last_seen_at: now,
      push_tokens: { web: web_token || null, fcm: fcm_token || null },
      settings: { interval_min: 10, tz: "Asia/Seoul" },
      channels: {
        web: channels?.web ?? Boolean(web_token),
        fcm: channels?.fcm ?? Boolean(fcm_token)
      }
    },
    { merge: true }
  );

  return res.json({ ok: true });
}
