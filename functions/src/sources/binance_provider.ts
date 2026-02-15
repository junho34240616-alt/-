import { api_error } from "../shared/http_types";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function get_binance_quotes(symbols: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (symbols.length === 0) return out;

  const batches = chunk(symbols, 100);
  for (const batch of batches) {
    const url = new URL("https://api.binance.com/api/v3/ticker/price");
    url.searchParams.set("symbols", JSON.stringify(batch));

    const resp = await fetch(url.toString(), { method: "GET" });
    if (!resp.ok) {
      throw new api_error({
        code: "UPSTREAM_ERROR",
        status: 502,
        message: `binance upstream error: ${resp.status}`,
        trace_id: "upstream"
      });
    }

    const data = (await resp.json()) as Array<{ symbol: string; price: string }>;
    for (const item of data) {
      const price = Number(item.price);
      if (Number.isFinite(price)) out.set(item.symbol, price);
    }
  }

  return out;
}
