import { describe, it, expect } from 'vitest';
import { renderSilent as render } from '../../../src/render.js';
import { validate } from '../../../src/validate.js';
import { functionItem } from '../../../src/nodes/function.js';

describe('functionItem() + render()', () => {
	it('renders a pub fn with params and return type that validates ok', () => {
		const node = functionItem({
			name: 'add',
			parameters: 'a: i32, b: i32',
			returnType: 'i32',
			body: 'a + b',
			children: ['pub'],
		});
		const output = render(node);
		expect(output).toContain('pub fn add');
		expect(output).toContain('a: i32');
		expect(output).toContain('b: i32');
		expect(output).toContain('-> i32');
		expect(output).toContain('a + b');
		const vr = validate(output);
		expect(vr.ok).toBe(true);
	});

	it('omits the return type arrow when returnType is undefined', () => {
		const node = functionItem({
			name: 'do_something',
			body: 'println!("hi");',
		});
		const output = render(node);
		expect(output).not.toContain('->');
		expect(output).toContain('fn do_something()');
		const vr = validate(output);
		expect(vr.ok).toBe(true);
	});

	it('renders a private function (no visibility keyword)', () => {
		const node = functionItem({ name: 'helper', body: '42' });
		const output = render(node);
		expect(output).not.toMatch(/^pub\s/);
		expect(output).toContain('fn helper');
		const vr = validate(output);
		expect(vr.ok).toBe(true);
	});

	it('throws a descriptive error when name is empty', () => {
		expect(() => functionItem({ name: '', body: 'x' })).toThrow(/name/i);
	});

	it('throws a descriptive error when body is empty', () => {
		expect(() => functionItem({ name: 'f', body: '' })).toThrow(/body/i);
	});

	it('throws when name is whitespace-only', () => {
		expect(() => functionItem({ name: '  ', body: '42' })).toThrow(/name/i);
	});

	it('renders correctly when parameters is not provided (undefined)', () => {
		const node = functionItem({ name: 'noop', body: '()' });
		const output = render(node);
		expect(output).toContain('fn noop()');
		expect(output).not.toContain('undefined');
		const vr = validate(output);
		expect(vr.ok).toBe(true);
	});

	it('renders space-separated modifiers when children is a multi-element array', () => {
		const node = functionItem({
			name: 'run',
			body: 'todo!()',
			children: ['pub', 'async'],
		});
		const output = render(node);
		expect(output).toContain('pub async fn run');
		expect(output).not.toContain('pub,async');
		const vr = validate(output);
		expect(vr.ok).toBe(true);
	});
});
