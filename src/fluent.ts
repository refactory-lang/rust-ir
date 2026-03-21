/**
 * Fluent builder API for Rust IR nodes.
 *
 * Implements BuilderTerminal from @refactory/grammar-types so all builders
 * share a uniform terminal interface: .build(), .render(), .renderSilent().
 *
 * @example
 * ```ts
 * import { ir } from '@refactory/rust-ir';
 *
 * ir.fn('greet').pub().params('name: &str').returns('String').body('format!("Hello, {name}")').render()
 * ir.struct('Point').pub().body('pub x: f64,\npub y: f64').render()
 * ir.use('std::collections::HashMap').render()
 * ```
 */
import type { BuilderTerminal } from '@refactory/grammar-types';
import type {
	RustIrNode,
	FunctionItem,
	StructItem,
	UseDeclaration,
	ImplItem,
	IfExpression,
	MacroInvocation,
	SourceFile,
} from './types.js';
import { functionItem } from './nodes/function.js';
import { structItem } from './nodes/struct.js';
import { useDeclaration } from './nodes/use.js';
import { implItem } from './nodes/impl.js';
import { ifExpression } from './nodes/if.js';
import { macroInvocation } from './nodes/macro.js';
import { sourceFile } from './nodes/source-file.js';
import { renderSilent } from './render.js';
import { assertValid } from './validate-fast.js';

// ---------------------------------------------------------------------------
// Function builder
// ---------------------------------------------------------------------------

class FunctionBuilder implements BuilderTerminal<FunctionItem> {
	private _name: string;
	private _params?: string;
	private _returnType?: string;
	private _body: string = 'todo!()';
	private _vis?: string[];

	constructor(name: string) {
		this._name = name;
	}

	pub(): this {
		this._vis = ['pub'] as any;
		return this;
	}

	params(...params: string[]): this {
		this._params = params.join(', ');
		return this;
	}

	returns(type: string): this {
		this._returnType = type;
		return this;
	}

	body(body: string): this {
		this._body = body;
		return this;
	}

	build(): FunctionItem {
		return functionItem({
			name: this._name,
			parameters: this._params,
			returnType: this._returnType,
			body: this._body,
			children: this._vis as any,
		});
	}

	render(): string {
		return assertValid(renderSilent(this.build()));
	}

	renderSilent(): string {
		return renderSilent(this.build());
	}
}

// ---------------------------------------------------------------------------
// Struct builder
// ---------------------------------------------------------------------------

class StructBuilder implements BuilderTerminal<StructItem> {
	private _name: string;
	private _body?: string;
	private _vis?: string[];

	constructor(name: string) {
		this._name = name;
	}

	pub(): this {
		this._vis = ['pub'] as any;
		return this;
	}

	body(body: string): this {
		this._body = body;
		return this;
	}

	build(): StructItem {
		return structItem({
			name: this._name,
			body: this._body,
			children: this._vis as any,
		});
	}

	render(): string {
		return assertValid(renderSilent(this.build()));
	}

	renderSilent(): string {
		return renderSilent(this.build());
	}
}

// ---------------------------------------------------------------------------
// Use builder
// ---------------------------------------------------------------------------

class UseBuilder implements BuilderTerminal<UseDeclaration> {
	private _argument: string;

	constructor(argument: string) {
		this._argument = argument;
	}

	build(): UseDeclaration {
		return useDeclaration({ argument: this._argument });
	}

	render(): string {
		return assertValid(renderSilent(this.build()));
	}

	renderSilent(): string {
		return renderSilent(this.build());
	}
}

// ---------------------------------------------------------------------------
// Impl builder
// ---------------------------------------------------------------------------

class ImplBuilder implements BuilderTerminal<ImplItem> {
	private _type: string;
	private _trait?: string;
	private _body?: string;

	constructor(type: string) {
		this._type = type;
	}

	trait(name: string): this {
		this._trait = name;
		return this;
	}

	body(body: string): this {
		this._body = body;
		return this;
	}

	build(): ImplItem {
		return implItem({
			type: this._type,
			trait: this._trait,
			body: this._body,
		});
	}

	render(): string {
		return assertValid(renderSilent(this.build()));
	}

	renderSilent(): string {
		return renderSilent(this.build());
	}
}

// ---------------------------------------------------------------------------
// If builder
// ---------------------------------------------------------------------------

class IfBuilder implements BuilderTerminal<IfExpression> {
	private _condition: string;
	private _consequence: string = 'todo!()';
	private _alternative?: RustIrNode | string;

	constructor(condition: string) {
		this._condition = condition;
	}

	then(consequence: string): this {
		this._consequence = consequence;
		return this;
	}

	else_(alternative: RustIrNode | string): this {
		this._alternative = alternative;
		return this;
	}

	elseIf(condition: string): IfBuilder {
		const nested = new IfBuilder(condition);
		this._alternative = nested.build();
		return nested;
	}

	build(): IfExpression {
		return ifExpression({
			condition: this._condition,
			consequence: this._consequence,
			alternative: this._alternative as any,
		});
	}

	render(): string {
		return assertValid(renderSilent(this.build()));
	}

	renderSilent(): string {
		return renderSilent(this.build());
	}
}

// ---------------------------------------------------------------------------
// Macro builder
// ---------------------------------------------------------------------------

class MacroBuilder implements BuilderTerminal<MacroInvocation> {
	private _macro: string;
	private _children: string = '';

	constructor(macro: string) {
		this._macro = macro;
	}

	args(...args: string[]): this {
		this._children = args.join(', ');
		return this;
	}

	build(): MacroInvocation {
		return macroInvocation({
			macro: this._macro,
			children: this._children,
		});
	}

	render(): string {
		return assertValid(renderSilent(this.build()));
	}

	renderSilent(): string {
		return renderSilent(this.build());
	}
}

// ---------------------------------------------------------------------------
// Source file builder
// ---------------------------------------------------------------------------

class SourceFileBuilder implements BuilderTerminal<SourceFile> {
	private _children: Array<RustIrNode | string>;

	constructor(children: Array<RustIrNode | string>) {
		this._children = children;
	}

	build(): SourceFile {
		return sourceFile({ children: this._children as any });
	}

	render(): string {
		return assertValid(renderSilent(this.build()));
	}

	renderSilent(): string {
		return renderSilent(this.build());
	}
}

// ---------------------------------------------------------------------------
// Namespace entry point
// ---------------------------------------------------------------------------

export const ir = {
	fn: (name: string) => new FunctionBuilder(name),
	struct: (name: string) => new StructBuilder(name),
	use: (argument: string) => new UseBuilder(argument),
	impl: (type: string) => new ImplBuilder(type),
	if: (condition: string) => new IfBuilder(condition),
	macro: (name: string) => new MacroBuilder(name),
	file: (children: Array<RustIrNode | string>) => new SourceFileBuilder(children),
};
