import { get_firestore } from "./firestore_admin";

function mask_token(token: string): string {
  if (!token) return "";
  return token.slice(0, 6) + "****";
}

export async function log_error(doc: {
  type: string;
  msg: string;
  at?: Date;
  rule_id?: string;
  symbol?: string;
  token_hint?: string;
}) {
  const db = get_firestore();
  await db.collection("ops").doc("errors").collection("items").add({
    type: doc.type,
    msg: doc.msg.slice(0, 500),
    at: doc.at || new Date(),
    rule_id: doc.rule_id || null,
    symbol: doc.symbol || null,
    token_hint: doc.token_hint ? mask_token(doc.token_hint) : null
  });
}
