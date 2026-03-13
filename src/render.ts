import type { RustIrNode, StructItem, FunctionItem, UseDeclaration, ImplItem, IfExpression, MacroInvocation } from "./types.js";

/**
 * Render any IR node to a Rust source string.
 *
 * Pure function — no side effects. Each branch is implemented in the
 * corresponding node-kind phase; until then the branch throws so that
 * failing tests give a clear signal.
 */
export function render(node: RustIrNode): string {
  switch (node.kind) {
    case "struct_item":
      return renderStruct(node);
    case "function_item":
      return renderFunction(node);
    case "use_declaration":
      return renderUse(node);
    case "impl_item":
      return renderImpl(node);
    case "if_expression":
      return renderIf(node);
    case "macro_invocation":
      return renderMacro(node);
    case "source_file":
      return node.items.map(render).join("\n\n");
  }
}

// ---------------------------------------------------------------------------
// macro_invocation
// ---------------------------------------------------------------------------

function renderMacro(node: MacroInvocation): string {
  return `${node.macro}!(${node.tokens})`;
}

// ---------------------------------------------------------------------------
// if_expression
// ---------------------------------------------------------------------------

function renderIf(node: IfExpression): string {
  let output = `if ${node.condition} {\n    ${node.consequence}\n}`;
  for (const clause of node.elseIfClauses) {
    output += ` else if ${clause.condition} {\n    ${clause.consequence}\n}`;
  }
  if (node.elseClause !== undefined) {
    output += ` else {\n    ${node.elseClause}\n}`;
  }
  return output;
}

// ---------------------------------------------------------------------------
// impl_item
// ---------------------------------------------------------------------------

function renderImpl(node: ImplItem): string {
  const header = node.trait
    ? `impl ${node.trait} for ${node.type} {`
    : `impl ${node.type} {`;
  const methods = node.methods
    .map((m) =>
      renderFunction(m)
        .split("\n")
        .map((line) => `    ${line}`)
        .join("\n")
    )
    .join("\n\n");
  return methods.length > 0 ? `${header}\n${methods}\n}` : `${header}\n}`;
}

// ---------------------------------------------------------------------------
// use_declaration
// ---------------------------------------------------------------------------

function renderUse(node: UseDeclaration): string {
  return `use ${node.argument};`;
}

// ---------------------------------------------------------------------------
// function_item
// ---------------------------------------------------------------------------

function renderFunction(node: FunctionItem): string {
  const vis = node.visibility ? `${node.visibility} ` : "";
  const paramList = node.params.map((p) => `${p.name}: ${p.type}`).join(", ");
  const ret = node.returnType ? ` -> ${node.returnType}` : "";
  return `${vis}fn ${node.name}(${paramList})${ret} {\n    ${node.body}\n}`;
}

// ---------------------------------------------------------------------------
// struct_item
// ---------------------------------------------------------------------------

function renderStruct(node: StructItem): string {
  const lines: string[] = [];
  if (node.derives.length > 0) {
    lines.push(`#[derive(${node.derives.join(", ")})]`);
  }
  const vis = node.visibility ? `${node.visibility} ` : "";
  if (node.fields.length === 0) {
    lines.push(`${vis}struct ${node.name};`);
  } else {
    lines.push(`${vis}struct ${node.name} {`);
    for (const field of node.fields) {
      lines.push(`    ${field.name}: ${field.type},`);
    }
    lines.push("}");
  }
  return lines.join("\n");
}
