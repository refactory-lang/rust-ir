import type { RustIrNode, StructItem, FunctionItem, UseDeclaration, ImplItem, IfExpression, MacroInvocation, SourceFile } from "./types.js";

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
      return renderSourceFile(node);
  }
}

// ---------------------------------------------------------------------------
// source_file
// ---------------------------------------------------------------------------

function renderSourceFile(node: SourceFile): string {
  if (!node.children) return '';
  // children is a branded string[] — each entry is a rendered item
  return (node.children as unknown as string[]).map(s => s).join("\n\n");
}

// ---------------------------------------------------------------------------
// macro_invocation
// ---------------------------------------------------------------------------

function renderMacro(node: MacroInvocation): string {
  return `${node.macro}!(${node.children})`;
}

// ---------------------------------------------------------------------------
// if_expression
// ---------------------------------------------------------------------------

function renderIf(node: IfExpression): string {
  let output = `if ${node.condition} {\n    ${node.consequence}\n}`;
  if (node.alternative !== undefined) {
    output += ` else {\n    ${node.alternative}\n}`;
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
  const body = node.body ? String(node.body) : '';
  return body.length > 0 ? `${header}\n${body}\n}` : `${header}\n}`;
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
  const vis = node.children ? `${node.children} ` : "";
  const paramList = node.parameters ? String(node.parameters) : "";
  const ret = node.returnType ? ` -> ${node.returnType}` : "";
  return `${vis}fn ${node.name}(${paramList})${ret} {\n    ${node.body}\n}`;
}

// ---------------------------------------------------------------------------
// struct_item
// ---------------------------------------------------------------------------

function renderStruct(node: StructItem): string {
  const lines: string[] = [];
  const vis = node.children ? `${(node.children as unknown as string[])[0]} ` : "";
  if (node.body) {
    lines.push(`${vis}struct ${node.name} {\n${node.body}\n}`);
  } else {
    lines.push(`${vis}struct ${node.name};`);
  }
  return lines.join("\n");
}
