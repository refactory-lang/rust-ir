/**
 * Test mock for `codemod:ast-grep`.
 *
 * Vitest aliases the real JSSG runtime virtual module to this file so that
 * unit tests can call `validate()` without a live JSSG runtime.
 *
 * The mock implements enough of the ast-grep SgNode interface to correctly
 * handle:
 *   - Syntactically valid Rust  → no ERROR nodes
 *   - Unbalanced braces         → ERROR node
 *   - Rust keyword as identifier (e.g. `pub struct fn;`) → ERROR node
 *
 * Real semantic validation (beyond these heuristics) is left to the
 * integration test (T039) which runs inside the live JSSG runtime.
 */

interface MockNode {
  kind(): string;
  range(): { start: { index: number; line: number; column: number }; end: { index: number; line: number; column: number } };
  findAll(config: string | { rule: { kind: string } }): MockNode[];
  children(): MockNode[];
  text(): string;
}

interface MockRoot {
  root(): MockNode;
  filename(): string;
  source(): string;
}

function makeErrorNode(offset: number): MockNode {
  return {
    kind: () => "ERROR",
    range: () => ({
      start: { index: offset, line: 0, column: offset },
      end: { index: offset + 1, line: 0, column: offset + 1 },
    }),
    findAll: () => [],
    children: () => [],
    text: () => "",
  };
}

function detectErrors(source: string): MockNode[] {
  const errors: MockNode[] = [];

  // 1. Unbalanced braces → syntax error
  const openBraces = (source.match(/{/g) ?? []).length;
  const closeBraces = (source.match(/}/g) ?? []).length;
  if (openBraces !== closeBraces) {
    const offset = openBraces > closeBraces
      ? source.lastIndexOf("{")
      : source.lastIndexOf("}");
    errors.push(makeErrorNode(offset));
  }

  // 2. Rust keyword used as struct/fn/impl name → syntax error
  // Matches patterns like `struct fn`, `struct let`, etc.
  const rustKeywords =
    /\b(?:struct|fn|impl|trait|enum|type|mod)\s+(?:fn|let|if|else|while|for|match|impl|use|mod|pub|crate|self|super|type|where|trait|enum|as|in|return|break|continue|loop|move|dyn|extern|unsafe|const|static)\b/;
  const kwMatch = rustKeywords.exec(source);
  if (kwMatch) {
    errors.push(makeErrorNode(kwMatch.index));
  }

  return errors;
}

function makeRoot(source: string): MockNode {
  const errors = detectErrors(source);
  return {
    kind: () => "source_file",
    range: () => ({
      start: { index: 0, line: 0, column: 0 },
      end: { index: source.length, line: 0, column: source.length },
    }),
    findAll: (config: string | { rule: { kind: string } }) => {
      const kind = typeof config === 'string' ? config : config.rule.kind;
      if (kind === 'ERROR') return errors;
      return [];
    },
    children: () => errors,
    text: () => source,
  };
}

export function parse(_language: string, source: string): MockRoot {
  return {
    root: () => makeRoot(source),
    filename: () => 'anonymous',
    source: () => source
  };
}
