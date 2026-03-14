import { describe, it, expect } from "vitest";
import { render } from "../../../src/render.js";
import { validate } from "../../../src/validate.js";
import { functionItem } from "../../../src/nodes/function.js";

describe("functionItem() + render()", () => {
  it("renders a pub fn with params and return type that validates ok", () => {
    const node = functionItem({
      name: "add",
      parameters: "a: i32, b: i32",
      returnType: "i32",
      body: "a + b",
      children: ["pub"],
    });
    const output = render(node);
    expect(output).toContain("pub fn add");
    expect(output).toContain("a: i32");
    expect(output).toContain("b: i32");
    expect(output).toContain("-> i32");
    expect(output).toContain("a + b");
    const vr = validate(output);
    expect(vr.ok).toBe(true);
  });

  it("omits the return type arrow when returnType is undefined", () => {
    const node = functionItem({
      name: "do_something",
      body: "println!(\"hi\");",
    });
    const output = render(node);
    expect(output).not.toContain("->");
    expect(output).toContain("fn do_something()");
    const vr = validate(output);
    expect(vr.ok).toBe(true);
  });

  it("renders a private function (no visibility keyword)", () => {
    const node = functionItem({ name: "helper", body: "42" });
    const output = render(node);
    expect(output).not.toMatch(/^pub\s/);
    expect(output).toContain("fn helper");
    const vr = validate(output);
    expect(vr.ok).toBe(true);
  });

  it("throws a descriptive error when name is empty", () => {
    expect(() => functionItem({ name: "", body: "x" })).toThrow(/name/i);
  });

  it("throws a descriptive error when body is empty", () => {
    expect(() => functionItem({ name: "f", body: "" })).toThrow(/body/i);
  });
});
