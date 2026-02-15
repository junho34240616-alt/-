import { api_error } from "../shared/http_types";

type finnhub_quote = { c: number };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function get_finnhub_quotes(symbols: string[]): Promise<{ quotes: Map<string, number>; skipped_429: string[] }> {
  const quotes = new Map<string, number>();
  const skipped_429: string[] = [];
  if (symbols.length === 0) return { quotes, skipped_429 };

  const api_key = process.env.FINNHUB_api_key;
  if (!api_key) {
    throw new api_error({
      code: "UPSTREAM_ERROR",
      status: 500,
      message: "finnhub api key missing",
      trace_id: "config"
    });
  }

  const min_interval_ms = 1100;
  let last_call_at = 0;

  for (const symbol of symbols) {
    const now = Date.now();
    const wait_ms = last_call_at === 0 ? 0 : Math.max(0, min_interval_ms - (now - last_call_at));
    if (wait_ms > 0) await sleep(wait_ms);

    last_call_at = Date.now();

    const url = new URL("https://finnhub.io/api/v1/quote");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("token", api_key);

    const resp = await fetch(url.toString(), { method: "GET" });

    if (resp.status === 429) {
      skipped_429.push(symbol);
      continue;
    }

    if (!resp.ok) {
      throw new api_error({
        code: "UPSTREAM_ERROR",
        status: 502,
        message: `finnhub upstream error: ${resp.status}`,
        trace_id: "upstream"
      });
    }

    const data = (await resp.json()) as finnhub_quote;
    const price = Number(data?.c);
    if (Number.isFinite(price) && price > 0) quotes.set(symbol, price);
  }

  return { quotes, skipped_429 };
}
