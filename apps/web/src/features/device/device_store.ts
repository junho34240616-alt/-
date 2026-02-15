"use client";

import { useEffect, useMemo, useState } from "react";

function get_or_create_device_id(): string {
  const key = "device_id";
  const existing = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  if (existing) return existing;

  const device_id = crypto.randomUUID();
  window.localStorage.setItem(key, device_id);
  return device_id;
}

export function use_device_id() {
  const [device_id, set_device_id] = useState<string>("");

  useEffect(() => {
    set_device_id(get_or_create_device_id());
  }, []);

  return useMemo(() => ({ device_id }), [device_id]);
}
