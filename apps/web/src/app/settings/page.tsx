"use client";

import { useState } from "react";
import { run_price_check_manual } from "../../features/ops/ops_api";

export default function settings_page() {
  const [cron_secret, set_cron_secret] = useState("");
  const [status, set_status] = useState("");

  async function on_manual_run() {
    set_status("running...");
    const result = await run_price_check_manual(cron_secret);
    set_status(JSON.stringify(result, null, 2));
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>운영/헬스체크(mvp)</h2>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div>수동 실행(운영자)</div>
        <input
          value={cron_secret}
          onChange={(e) => set_cron_secret(e.target.value)}
          placeholder="x-cron-secret"
          style={{ width: "100%", marginTop: 8 }}
        />
        <button onClick={on_manual_run} style={{ marginTop: 12 }}>
          run_price_check
        </button>
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{status}</pre>
      </div>
    </div>
  );
}
