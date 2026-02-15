"use client";

import Link from "next/link";
import { useState } from "react";
import { use_device_id } from "../features/device/device_store";
import { api_client } from "../lib/api_client";

export default function page() {
  const { device_id } = use_device_id();
  const [status, set_status] = useState<string>("");

  async function on_register_device() {
    set_status("registering...");
    const res = await api_client.post<{}>("/register_device", {
      device_id,
      channels: { web: false, fcm: false }
    });

    set_status(res.ok ? "ok" : `${res.error.code}: ${res.error.message}`);
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1>price_alert mvp</h1>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div>
          <b>device_id</b>
        </div>
        <div style={{ wordBreak: "break-all" }}>{device_id || "loading..."}</div>

        <button onClick={on_register_device} style={{ marginTop: 12 }}>
          register_device
        </button>

        <div style={{ marginTop: 12 }}>{status}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Link href="/settings">설정/운영</Link>
      </div>
    </div>
  );
}
