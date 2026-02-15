import crypto from "crypto";
import type { Request } from "express";
import { api_error } from "../shared/http_types";
import { get_trace_id } from "../shared/trace_id";

function timing_safe_equal(a: string, b: string): boolean {
  const a_buf = Buffer.from(a);
  const b_buf = Buffer.from(b);
  if (a_buf.length !== b_buf.length) return false;
  return crypto.timingSafeEqual(a_buf, b_buf);
}

export function verify_cron_secret(req: Request) {
  const trace_id = get_trace_id(req);
  const expected = process.env.CRON_SECRET;
  const provided = req.header("x-cron-secret");

  if (!expected) {
    throw new api_error({
      code: "UNAUTHORIZED",
      status: 401,
      message: "server cron_secret not configured",
      trace_id
    });
  }

  if (!provided || !timing_safe_equal(provided, expected)) {
    throw new api_error({
      code: "UNAUTHORIZED",
      status: 401,
      message: "invalid cron secret",
      trace_id
    });
  }
}
