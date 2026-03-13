import { describe, it, expect } from "vitest";
import { render } from "../../../src/render.js";
import { validate } from "../../../src/validate.js";
import { structItem } from "../../../src/nodes/struct.js";

describe("structItem() + render()", () => {
  it("renders a named-field pub struct with derives that validates ok", () => {
    const node = structItem({
      name: "Guard",
      fields: [
        { name: "value", type: "i32" },
        { name: "active", type: "bool" },
      ],
      derives: ["Debug", "Clone"],
      visibility: "pub",
    });
    const output = render(node);
    expect(output).toContain("#[derive(Debug, Clone)]");
    expect(output).toContain("pub struct Guard");
    expect(output).toContain("value: i32");
    expect(output).toContain("active: bool");
    const vr = validate(output);
    expect(vr.ok).toBe(true);
  });

  it("renders a unit struct (no fields) that validates ok", () => {
    const node = structItem({ name: "Sentinel", visibility: "pub" });
    const output = render(node);
    expect(output).toContain("pub struct Sentinel;");
    expect(output).not.toContain("{");
    const vr = validate(output);
    expect(vr.ok).toBe(true);
  });

  it("renders a private struct (no visibility) that validates ok", () => {
    const node = structItem({ name: "Inner", fields: [{ name: "x", type: "f64" }] });
    const output = render(node);
    expect(output).not.toMatch(/^pub\s/);
    expect(output).toContain("struct Inner");
    const vr = validate(output);
    expect(vr.ok).toBe(true);
  });

  it("throws a descriptive error when name is empty", () => {
    expect(() => structItem({ name: "" })).toThrow(/name/i);
  });
});
