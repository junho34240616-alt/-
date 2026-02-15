import { env } from "../../lib/env";

export async function run_price_check_manual(cron_secret: string) {
  const res = await fetch(`${env.functions_base_url}/run_price_check`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-cron-secret": cron_secret
    },
    body: JSON.stringify({ source: "manual", interval_min: 10 })
  });

  return res.json().catch(() => ({ ok: false, error: { code: "BAD_RESPONSE", message: "invalid json", trace_id: "web" } }));
}
