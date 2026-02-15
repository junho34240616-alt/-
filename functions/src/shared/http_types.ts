export type api_error_code =
  | "INVALID_ARGUMENT"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "UPSTREAM_ERROR"
  | "PUSH_FAILED"
  | "JOB_FAILED"
  | "NOT_FOUND";

export class api_error extends Error {
  public readonly code: api_error_code;
  public readonly status: number;
  public readonly trace_id: string;

  constructor(args: { code: api_error_code; status: number; message: string; trace_id: string }) {
    super(args.message);
    this.code = args.code;
    this.status = args.status;
    this.trace_id = args.trace_id;
  }
}
