import type { Request, Response } from "express";
import { z } from "zod";
import { get_firestore } from "../ops/firestore_admin";
import { enforce_rate_limit } from "../security/rate_limit";
import { api_error } from "../shared/http_types";
import { get_trace_id } from "../shared/trace_id";

const uuid_v4_re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const symbol_re = /^[A-Z0-9._-]{1,20}$/;

const create_schema = z.object({
  device_id: z.string().regex(uuid_v4_re),
  asset_type: z.enum(["coin", "stock"]),
  provider: z.enum(["BINANCE", "FINNHUB"]),
  symbol: z.string().regex(symbol_re),
  display_name: z.string().min(1).max(40).optional()
});

export async function watchlist_handler(req: Request, res: Response) {
  const trace_id = get_trace_id(req);
  const db = get_firestore();

  if (req.method === "POST") {
    const parsed = create_schema.safeParse(req.body);
    if (!parsed.success) throw new api_error({ code: "INVALID_ARGUMENT", status: 400, message: "invalid watchlist payload", trace_id });

    const { device_id } = parsed.data;
    await enforce_rate_limit(req, { device_id, limit_per_min: 60 });

    const ref = db.collection(`devices/${device_id}/watchlist`).doc();
    const now = new Date();

    await ref.set({ ...parsed.data, order: now.getTime(), created_at: now });
    return res.json({ ok: true, watch_id: ref.id });
  }

  if (req.method === "DELETE") {
    const watch_id = String(req.params.watch_id || "");
    const device_id = String(req.query.device_id || "");

    if (!uuid_v4_re.test(device_id) || watch_id.length < 6) {
      throw new api_error({ code: "INVALID_ARGUMENT", status: 400, message: "invalid device_id/watch_id", trace_id });
    }

    await enforce_rate_limit(req, { device_id, limit_per_min: 60 });
    await db.doc(`devices/${device_id}/watchlist/${watch_id}`).delete();
    return res.json({ ok: true });
  }

  throw new api_error({ code: "INVALID_ARGUMENT", status: 405, message: "method not allowed", trace_id });
}
