import type { Request, Response } from "express";
import { z } from "zod";
import { api_error } from "../shared/http_types";
import { get_trace_id } from "../shared/trace_id";

const query_schema = z.object({
  q: z.string().min(1).max(40),
  type: z.enum(["coin", "stock"])
});

export async function search_handler(req: Request, res: Response) {
  const trace_id = get_trace_id(req);
  const parsed = query_schema.safeParse({ q: req.query.q, type: req.query.type });

  if (!parsed.success) {
    throw new api_error({ code: "INVALID_ARGUMENT", status: 400, message: "invalid search query", trace_id });
  }

  return res.json({ ok: true, items: [] });
}
