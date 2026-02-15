import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

export function attach_trace_id() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const incoming = req.header("x-trace-id");
    const trace_id = incoming && incoming.length <= 80 ? incoming : crypto.randomUUID();
    (req as any).trace_id = trace_id;
    next();
  };
}

export function get_trace_id(req: Request): string {
  return ((req as any).trace_id as string) || "unknown";
}
