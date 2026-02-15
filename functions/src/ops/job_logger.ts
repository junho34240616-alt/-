import { get_firestore } from "./firestore_admin";

export async function log_job_run(doc: {
  started_at: number;
  ended_at: number;
  status: "ok" | "failed";
  checked_rules: number;
  notified: number;
  api_failures?: number;
  push_failures?: number;
}) {
  const db = get_firestore();
  await db.collection("ops").doc("job_runs").collection("items").add({
    ...doc,
    started_at: new Date(doc.started_at),
    ended_at: new Date(doc.ended_at),
    created_at: new Date()
  });
}
