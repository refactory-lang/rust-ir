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
    const method = functionItem({
      name: "fmt",
      parameters: "&self, f: &mut fmt::Formatter",
      returnType: "fmt::Result",
      body: 'write!(f, "({}, {})", self.x, self.y)',
    });
    const renderedMethod = render(method).split('\n').map(line => '    ' + line).join('\n');
    const children = [
      render(useDeclaration({ argument: "std::fmt::Display" })),
      render(structItem({ name: "Point", body: "    x: f64,\n    y: f64,", children: ["pub"] })),
      render(implItem({
        type: "Point",
        trait: "Display",
        body: renderedMethod,
      })),
    ];
    const node = sourceFile({ children });
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
    const node = sourceFile({ children: [render(structItem({ name: "Solo" }))] });
    const output = render(node);
    expect(output).not.toMatch(/\n\n/);
    const vr = validate(output);
    expect(vr.ok).toBe(true);
  });

  it("throws when children array is empty", () => {
    expect(() => sourceFile({ children: [] })).toThrow(/children/i);
  });
});
