import { describe, it, expect } from 'vitest';
import { render } from '../../../src/render.js';
import { validate } from '../../../src/validate.js';
import { macroInvocation } from '../../../src/nodes/macro.js';

describe('macroInvocation() + render()', () => {
	it('renders format! invocation that validates ok', () => {
		const node = macroInvocation({ macro: 'format', children: '"hello {}", name' });
		const output = render(node);
		expect(output).toBe('format!("hello {}", name)');
		const vr = validate(output);
		expect(vr.ok).toBe(true);
	});

	it('renders bracket-delimited macro invocations verbatim', () => {
		const node = macroInvocation({ macro: 'vec', children: '[1, 2, 3]' });
		const output = render(node);
		expect(output).toBe('vec![1, 2, 3]');
		const vr = validate(`fn main() { let values = ${output}; }`);
		expect(vr.ok).toBe(true);
	});

	it('renders brace-delimited macro invocations verbatim', () => {
		const node = macroInvocation({
			macro: 'thread_local',
			children: '{ static FOO: std::cell::Cell<u32> = const { std::cell::Cell::new(1) }; }'
		});
		const output = render(node);
		expect(output).toBe(
			'thread_local!{ static FOO: std::cell::Cell<u32> = const { std::cell::Cell::new(1) }; }'
		);
		const vr = validate(output);
		expect(vr.ok).toBe(true);
	});

	it('renders println! invocation that validates ok', () => {
		const node = macroInvocation({ macro: 'println', children: '"done"' });
		const output = render(node);
		expect(output).toBe('println!("done")');
		const vr = validate(output);
		expect(vr.ok).toBe(true);
	});

	it('throws when macro name is empty', () => {
		expect(() => macroInvocation({ macro: '', children: 'x' })).toThrow(/macro/i);
	});

	it('throws when macro name is whitespace-only', () => {
		expect(() => macroInvocation({ macro: '  ', children: 'x' })).toThrow(/macro/i);
	});

	it('throws when children is empty', () => {
		expect(() => macroInvocation({ macro: 'println', children: '' })).toThrow(/children/i);
	});

	it('throws when children is whitespace-only', () => {
		expect(() => macroInvocation({ macro: 'println', children: '  ' })).toThrow(/children/i);
	});
});
