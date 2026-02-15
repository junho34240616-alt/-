import type { Request, Response } from "express";
import { should_notify_today, to_kst_date_key } from "../engine/daily_limit";
import { evaluate_hit } from "../engine/rule_evaluator";
import { log_error } from "../ops/error_logger";
import { get_firestore } from "../ops/firestore_admin";
import { log_job_run } from "../ops/job_logger";
import { send_fcm_push } from "../notify/fcm_sender";
import { verify_cron_secret } from "../security/cron_secret";
import { get_binance_quotes } from "../sources/binance_provider";
import { get_finnhub_quotes } from "../sources/finnhub_provider";
import { get_trace_id } from "../shared/trace_id";

type rule_doc = {
  device_id: string;
  watch_id: string;
  rule_path?: string;
  asset_type: "coin" | "stock";
  provider: "BINANCE" | "FINNHUB";
  symbol: string;
  display_name: string;
  comparator: "GTE" | "LTE";
  target_price: number;
  enabled: boolean;
  auto_disable_on_hit: boolean;
  last_notified_at: FirebaseFirestore.Timestamp | null;
  channels: { web: boolean; fcm: boolean };
  push_tokens: { web?: string | null; fcm?: string | null };
  updated_at?: FirebaseFirestore.Timestamp | null;
};

type queued_write = { ref: FirebaseFirestore.DocumentReference; data: any };

function unique(arr: string[]) {
  return Array.from(new Set(arr));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safe_msg(e: any) {
  return (e?.message || String(e)).slice(0, 300);
}

async function retry2<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await sleep(400);
    return await fn();
  }
}

export async function run_price_check_handler(req: Request, res: Response) {
  const trace_id = get_trace_id(req);
  const db = get_firestore();
  const started_at = Date.now();

  async function acquire_job_lock(lock_ttl_ms: number): Promise<boolean> {
    const ref = db.collection("ops_locks").doc("run_price_check");
    const now = new Date();

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const locked_until = snap.exists ? (snap.data()?.locked_until as FirebaseFirestore.Timestamp | undefined) : undefined;

      if (locked_until && locked_until.toDate().getTime() > now.getTime()) {
        return false;
      }

      tx.set(ref, { locked_until: new Date(now.getTime() + lock_ttl_ms), updated_at: now }, { merge: true });
      return true;
    });
  }

  try {
    verify_cron_secret(req);

    const locked = await acquire_job_lock(9 * 60 * 1000);
    if (!locked) {
      return res.status(200).json({ ok: true, skipped: true, reason: "job already running" });
    }

    const now = new Date();
    const kst_date_key = to_kst_date_key(now);

    const snap = await db.collection("rules_active").where("enabled", "==", true).get();
    const rules = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as rule_doc) }));

    if (rules.length === 0) {
      await log_job_run({ started_at, ended_at: Date.now(), status: "ok", checked_rules: 0, notified: 0 });
      return res.json({ ok: true, checked: 0, notified: 0 });
    }

    const binance_symbols = unique(rules.filter((r) => r.provider === "BINANCE").map((r) => r.symbol));
    const finnhub_symbols = unique(rules.filter((r) => r.provider === "FINNHUB").map((r) => r.symbol));

    const [binance_map, finnhub_res] = await Promise.all([
      retry2(() => get_binance_quotes(binance_symbols)),
      retry2(() => get_finnhub_quotes(finnhub_symbols))
    ]);

    for (const symbol of finnhub_res.skipped_429) {
      await log_error({ type: "FINNHUB_429_SKIPPED", symbol, msg: "skipped due to 429 (rate limited)" });
    }

    const queued: queued_write[] = [];
    function queue_set(ref: FirebaseFirestore.DocumentReference, data: any) {
      queued.push({ ref, data });
    }

    async function commit_in_chunks(chunk_size: number) {
      for (let i = 0; i < queued.length; i += chunk_size) {
        const batch = db.batch();
        for (const write of queued.slice(i, i + chunk_size)) {
          batch.set(write.ref, write.data, { merge: true });
        }
        await batch.commit();
      }
    }

    let notified = 0;
    const finnhub_map = finnhub_res.quotes;

    for (const r of rules) {
      const price = r.provider === "BINANCE" ? binance_map.get(r.symbol) : finnhub_map.get(r.symbol);
      if (price == null) continue;
      if (!evaluate_hit(r.comparator, price, r.target_price)) continue;
      if (!should_notify_today(r.last_notified_at, kst_date_key)) continue;

      const has_token = Boolean((r.channels.web && r.push_tokens.web) || (r.channels.fcm && r.push_tokens.fcm));
      if (!has_token) continue;

      const tokens: string[] = [];
      if (r.channels.web && r.push_tokens.web) tokens.push(String(r.push_tokens.web));
      if (r.channels.fcm && r.push_tokens.fcm) tokens.push(String(r.push_tokens.fcm));

      try {
        await send_fcm_push(tokens, {
          title: `${r.symbol} 목표가 도달`,
          body: `현재가 ${price}, 조건 ${r.comparator === "GTE" ? ">=" : "<="} ${r.target_price}`,
          data: {
            rule_id: r.id,
            symbol: r.symbol,
            price: String(price),
            comparator: r.comparator,
            target_price: String(r.target_price)
          }
        });
        notified += 1;
      } catch (e: any) {
        await log_error({ type: "PUSH_FAILED", rule_id: r.id, symbol: r.symbol, msg: safe_msg(e), token_hint: tokens[0] });
        continue;
      }

      const update: any = { last_notified_at: now, updated_at: now };
      if (r.auto_disable_on_hit) update.enabled = false;

      queue_set(db.doc(`rules_active/${r.id}`), update);
      if (r.rule_path) queue_set(db.doc(r.rule_path), update);
    }

    await commit_in_chunks(400);

    await log_job_run({
      started_at,
      ended_at: Date.now(),
      status: "ok",
      checked_rules: rules.length,
      notified
    });

    return res.json({ ok: true, checked: rules.length, notified });
  } catch (e: any) {
    await log_error({ type: "JOB_FAILED", msg: safe_msg(e) });
    return res.status(500).json({ ok: false, error: { code: "JOB_FAILED", message: safe_msg(e), trace_id } });
  }
}
