import { env } from "./env";

type api_ok<T> = { ok: true } & T;
type api_fail = { ok: false; error: { code: string; message: string; trace_id: string } };

async function request_json<T>(path: string, init: RequestInit): Promise<api_ok<T> | api_fail> {
  if (!env.functions_base_url) {
    return { ok: false, error: { code: "CONFIG", message: "functions_base_url missing", trace_id: "web" } };
  }

  const url = `${env.functions_base_url}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init.headers || {})
      }
    });
  } catch (e: any) {
    return { ok: false, error: { code: "NETWORK_ERROR", message: (e?.message || "network error").slice(0, 200), trace_id: "web" } };
  }

  const raw = await res.text().catch(() => "");
  let data: any = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (data && typeof data === "object" && data.ok === false && data.error) return data as api_fail;
    return { ok: false, error: { code: "HTTP_ERROR", message: `http ${res.status}`, trace_id: "web" } };
  }

  return (data ?? { ok: false, error: { code: "BAD_RESPONSE", message: "empty json", trace_id: "web" } }) as api_ok<T> | api_fail;
}

export const api_client = {
  post: <T>(path: string, body: any) => request_json<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: any) => request_json<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request_json<T>(path, { method: "DELETE" }),
  get: <T>(path: string) => request_json<T>(path, { method: "GET" })
};
