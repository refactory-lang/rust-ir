// Public entry point — re-exports every public symbol from rust-ir.
export type {
  RustGrammar,
  RustNodeKind,
  RustNodeText,
  RustFieldText,
  NodeBuilderInput,
  Visibility,
  FieldDeclaration,
  ParameterDeclaration,
  StructItem,
  StructItemConfig,
  FunctionItem,
  FunctionItemConfig,
  UseDeclaration,
  UseDeclarationConfig,
  ImplItem,
  ImplItemConfig,
  IfExpression,
  IfExpressionConfig,
  MacroInvocation,
  MacroInvocationConfig,
  SourceFile,
  SourceFileConfig,
  RustIrNode,
  ValidationResult,
} from './types.js';

export { render } from './render.js';
export { validate } from './validate.js';

export { structItem } from './nodes/struct.js';
export { functionItem } from './nodes/function.js';
export { useDeclaration } from './nodes/use.js';
export { implItem } from './nodes/impl.js';
export { ifExpression } from './nodes/if.js';
export { macroInvocation } from './nodes/macro.js';
export { sourceFile } from './nodes/source-file.js';
