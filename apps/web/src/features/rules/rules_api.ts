import { api_client } from "../../lib/api_client";

export function create_rule(body: any) {
  return api_client.post<{ rule_id: string }>("/alert_rules", body);
}
