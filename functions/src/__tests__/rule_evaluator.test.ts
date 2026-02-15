import { evaluate_hit } from "../engine/rule_evaluator";

describe("evaluate_hit", () => {
  test("gte hit", () => {
    expect(evaluate_hit("GTE", 10, 10)).toBe(true);
    expect(evaluate_hit("GTE", 11, 10)).toBe(true);
    expect(evaluate_hit("GTE", 9, 10)).toBe(false);
  });

  test("lte hit", () => {
    expect(evaluate_hit("LTE", 10, 10)).toBe(true);
    expect(evaluate_hit("LTE", 9, 10)).toBe(true);
    expect(evaluate_hit("LTE", 11, 10)).toBe(false);
  });
});
