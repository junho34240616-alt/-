import { get_messaging } from "../ops/firestore_admin";
import { api_error } from "../shared/http_types";

type push_payload = {
  title: string;
  body: string;
  data: Record<string, string>;
};

function safe_string(v: any): string {
  if (v == null) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.slice(0, 300);
}

export async function send_fcm_push(tokens: string[], payload: push_payload): Promise<void> {
  if (tokens.length === 0) return;

  const messaging = get_messaging();
  const result = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, safe_string(v)]))
  });

  if (result.failureCount > 0) {
    throw new api_error({
      code: "PUSH_FAILED",
      status: 502,
      message: `push failures: ${result.failureCount}`,
      trace_id: "push"
    });
  }
}
