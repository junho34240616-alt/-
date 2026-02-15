export type comparator_type = "GTE" | "LTE";

export function evaluate_hit(comparator: comparator_type, price: number, target_price: number): boolean {
  if (comparator === "GTE") return price >= target_price;
  return price <= target_price;
}
