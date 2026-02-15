import type { NextFunction, Request, Response } from "express";
import { api_error } from "./http_types";
import { get_trace_id } from "./trace_id";

export function error_handler() {
  return (err: any, req: Request, res: Response, _next: NextFunction) => {
    const trace_id = get_trace_id(req);

    if (err instanceof api_error) {
      return res.status(err.status).json({
        ok: false,
        error: { code: err.code, message: err.message, trace_id }
      });
    }

    const message = (err?.message || String(err)).slice(0, 300);
    return res.status(500).json({
      ok: false,
      error: { code: "JOB_FAILED", message, trace_id }
    });
  };
}
