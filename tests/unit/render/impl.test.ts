import { describe, it, expect } from 'vitest';
import { render } from '../../../src/render.js';
import { validate } from '../../../src/validate.js';
import { implItem } from '../../../src/nodes/impl.js';
import { functionItem } from '../../../src/nodes/function.js';

describe('implItem() + render()', () => {
	it('renders an inherent impl block with a method that validates ok', () => {
		const method = functionItem({ name: 'new', body: 'Self { value: 0 }', returnType: 'Self' });
		const rendered = render(method)
			.split('\n')
			.map((line) => '    ' + line)
			.join('\n');
		const node = implItem({ type: 'Counter', body: rendered });
		const output = render(node);
		expect(output).toContain('impl Counter {');
		expect(output).toContain('fn new()');
		expect(output).not.toContain('for Counter');
		const vr = validate(output);
		expect(vr.ok).toBe(true);
	});

	it('renders a trait impl (impl Drop for Guard) that validates ok', () => {
		const dropFn = functionItem({
			name: 'drop',
			parameters: '&mut self',
			body: 'println!("dropped");',
		});
		const rendered = render(dropFn)
			.split('\n')
			.map((line) => '    ' + line)
			.join('\n');
		const node = implItem({ type: 'Guard', trait: 'Drop', body: rendered });
		const output = render(node);
		expect(output).toContain('impl Drop for Guard {');
		expect(output).toContain('fn drop');
		const vr = validate(output);
		expect(vr.ok).toBe(true);
	});

	it('renders an impl block with no methods that validates ok', () => {
		const node = implItem({ type: 'Empty' });
		const output = render(node);
		expect(output).toContain('impl Empty {');
		expect(output).toContain('}');
		const vr = validate(output);
		expect(vr.ok).toBe(true);
	});

	it('throws a descriptive error when type is empty', () => {
		expect(() => implItem({ type: '' })).toThrow(/type/i);
	});
});
