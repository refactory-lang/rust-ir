import { describe, it, expect } from "vitest";
import { render } from "../../../src/render.js";
import { validate } from "../../../src/validate.js";
import { sourceFile } from "../../../src/nodes/source-file.js";
import { useDeclaration } from "../../../src/nodes/use.js";
import { structItem } from "../../../src/nodes/struct.js";
import { implItem } from "../../../src/nodes/impl.js";
import { functionItem } from "../../../src/nodes/function.js";

describe("sourceFile() + render()", () => {
  it("renders use + struct + impl with blank-line separation that validates ok", () => {
    const items = [
      useDeclaration({ argument: "std::fmt::Display" }),
      structItem({ name: "Point", fields: [{ name: "x", type: "f64" }, { name: "y", type: "f64" }], visibility: "pub" }),
      implItem({
        type: "Point",
        trait: "Display",
        methods: [
          functionItem({ name: "fmt", params: [{ name: "&self", type: "" }, { name: "f", type: "&mut fmt::Formatter" }], returnType: "fmt::Result", body: 'write!(f, "({}, {})", self.x, self.y)' }),
        ],
      }),
    ];
    const node = sourceFile({ items });
    const output = render(node);
    // Items are separated by exactly two newlines
    const parts = output.split("\n\n");
    expect(parts.length).toBe(3);
    expect(output).toContain("use std::fmt::Display;");
    expect(output).toContain("pub struct Point");
    expect(output).toContain("impl Display for Point");
    const vr = validate(output);
    expect(vr.ok).toBe(true);
  });

  it("renders a single item with no extra blank lines", () => {
    const node = sourceFile({ items: [structItem({ name: "Solo" })] });
    const output = render(node);
    expect(output).not.toMatch(/\n\n/);
    const vr = validate(output);
    expect(vr.ok).toBe(true);
  });

  it("throws when items array is empty", () => {
    expect(() => sourceFile({ items: [] })).toThrow(/items/i);
  });
});
