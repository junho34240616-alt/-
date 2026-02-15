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
  watch_id: z.string().min(6).max(80),
  asset_type: z.enum(["coin", "stock"]),
  provider: z.enum(["BINANCE", "FINNHUB"]),
  symbol: z.string().regex(symbol_re),
  display_name: z.string().min(1).max(40).optional(),
  comparator: z.enum(["GTE", "LTE"]),
  target_price: z.number().finite().positive(),
  enabled: z.boolean().default(true),
  auto_disable_on_hit: z.boolean().default(false),
  channels: z.object({ web: z.boolean(), fcm: z.boolean() }).default({ web: true, fcm: true }),
  push_tokens: z.object({ web: z.string().optional(), fcm: z.string().optional() }).default({})
});

const patch_schema = z.object({
  device_id: z.string().regex(uuid_v4_re),
  enabled: z.boolean().optional(),
  target_price: z.number().finite().positive().optional(),
  comparator: z.enum(["GTE", "LTE"]).optional(),
  auto_disable_on_hit: z.boolean().optional(),
  channels: z.object({ web: z.boolean(), fcm: z.boolean() }).optional()
});

export async function alert_rules_handler(req: Request, res: Response) {
  const trace_id = get_trace_id(req);
  const db = get_firestore();

  if (req.method === "POST") {
    const parsed = create_schema.safeParse(req.body);
    if (!parsed.success) throw new api_error({ code: "INVALID_ARGUMENT", status: 400, message: "invalid alert_rules payload", trace_id });

    const { device_id, watch_id } = parsed.data;
    await enforce_rate_limit(req, { device_id, limit_per_min: 60 });

    const rules_ref = db.collection(`devices/${device_id}/watchlist/${watch_id}/rules`);
    const count_snap = await rules_ref.count().get();
    const count = count_snap.data().count || 0;
    if (count >= 10) {
      throw new api_error({ code: "INVALID_ARGUMENT", status: 400, message: "rule limit exceeded (max 10)", trace_id });
    }

    const now = new Date();
    const rule_ref = rules_ref.doc();
    const active_ref = db.collection("rules_active").doc(rule_ref.id);

    const device_snap = await db.doc(`devices/${device_id}`).get();
    const device_data = device_snap.data() || {};
    const device_push_tokens = device_data.push_tokens || {};

    await db.runTransaction(async (tx) => {
      tx.set(
        rule_ref,
        {
          comparator: parsed.data.comparator,
          target_price: parsed.data.target_price,
          enabled: parsed.data.enabled,
          auto_disable_on_hit: parsed.data.auto_disable_on_hit,
          last_notified_at: null,
          created_at: now,
          updated_at: now
        },
        { merge: true }
      );

      tx.set(
        active_ref,
        {
          device_id,
          watch_id,
          rule_path: rule_ref.path,
          asset_type: parsed.data.asset_type,
          provider: parsed.data.provider,
          symbol: parsed.data.symbol,
          display_name: parsed.data.display_name || parsed.data.symbol,
          comparator: parsed.data.comparator,
          target_price: parsed.data.target_price,
          enabled: parsed.data.enabled,
          auto_disable_on_hit: parsed.data.auto_disable_on_hit,
          last_notified_at: null,
          channels: parsed.data.channels,
          push_tokens: {
            web: parsed.data.push_tokens.web || device_push_tokens.web || null,
            fcm: parsed.data.push_tokens.fcm || device_push_tokens.fcm || null
          },
          updated_at: now
        },
        { merge: true }
      );
    });

    return res.json({ ok: true, rule_id: rule_ref.id });
  }

  if (req.method === "PATCH") {
    const rule_id = String(req.params.rule_id || "");
    const parsed = patch_schema.safeParse(req.body);
    if (!parsed.success || rule_id.length < 6) {
      throw new api_error({ code: "INVALID_ARGUMENT", status: 400, message: "invalid patch payload", trace_id });
    }

    const { device_id, ...patch } = parsed.data;
    await enforce_rate_limit(req, { device_id, limit_per_min: 60 });

    const now = new Date();
    const active_ref = db.doc(`rules_active/${rule_id}`);
    const snap = await active_ref.get();
    if (!snap.exists) throw new api_error({ code: "NOT_FOUND", status: 404, message: "rule not found", trace_id });

    await active_ref.set({ ...patch, updated_at: now }, { merge: true });

    const rule_path = (snap.data() as any)?.rule_path as string | undefined;
    if (rule_path) await db.doc(rule_path).set({ ...patch, updated_at: now }, { merge: true });

    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    const rule_id = String(req.params.rule_id || "");
    const device_id = String(req.query.device_id || "");

    if (!uuid_v4_re.test(device_id) || rule_id.length < 6) {
      throw new api_error({ code: "INVALID_ARGUMENT", status: 400, message: "invalid device_id/rule_id", trace_id });
    }

    await enforce_rate_limit(req, { device_id, limit_per_min: 60 });

    const active_ref = db.doc(`rules_active/${rule_id}`);
    const snap = await active_ref.get();

    if (snap.exists) {
      const rule_path = (snap.data() as any)?.rule_path as string | undefined;
      await active_ref.delete();
      if (rule_path) await db.doc(rule_path).delete();
    }

    return res.json({ ok: true });
  }

  throw new api_error({ code: "INVALID_ARGUMENT", status: 405, message: "method not allowed", trace_id });
}
