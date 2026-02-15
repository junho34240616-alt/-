import { api_client } from "../../lib/api_client";

export function create_watch(body: any) {
  return api_client.post<{ watch_id: string }>("/watchlist", body);
}
