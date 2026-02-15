import { to_kst_date_key } from "../engine/daily_limit";

describe("to_kst_date_key", () => {
  test("kst date boundary", () => {
    const d1 = new Date(Date.UTC(2026, 1, 14, 14, 0, 0));
    expect(to_kst_date_key(d1)).toBe("2026-02-14");

    const d2 = new Date(Date.UTC(2026, 1, 14, 16, 0, 0));
    expect(to_kst_date_key(d2)).toBe("2026-02-15");
  });
});
