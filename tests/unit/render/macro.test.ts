import { describe, it, expect } from "vitest";
import { render } from "../../../src/render.js";
import { validate } from "../../../src/validate.js";
import { macroInvocation } from "../../../src/nodes/macro.js";

describe("macroInvocation() + render()", () => {
  it("renders format! invocation that validates ok", () => {
    const node = macroInvocation({ macro: "format", tokens: '"hello {}", name' });
    const output = render(node);
    expect(output).toBe('format!("hello {}", name)');
    const vr = validate(output);
    expect(vr.ok).toBe(true);
  });

  it("renders println! invocation that validates ok", () => {
    const node = macroInvocation({ macro: "println", tokens: '"done"' });
    const output = render(node);
    expect(output).toBe('println!("done")');
    const vr = validate(output);
    expect(vr.ok).toBe(true);
  });

  it("throws when macro name is empty", () => {
    expect(() => macroInvocation({ macro: "", tokens: "x" })).toThrow(/macro/i);
  });

  it("throws when tokens is empty", () => {
    expect(() => macroInvocation({ macro: "println", tokens: "" })).toThrow(/tokens/i);
  });
});
