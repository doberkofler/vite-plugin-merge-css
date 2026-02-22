import {replaceExtension} from './util';
import {describe, it, expect} from 'vitest';

describe('util', () => {
	describe('replaceExtension', () => {
		it('should replace extension in a filename', () => {
			expect(replaceExtension('test.js', '.css')).toBe('test.css');
		});

		it('should replace extension in a path', () => {
			expect(replaceExtension('src/index.js', '.css')).toBe('src/index.css');
		});

		it('should handle filenames without extensions', () => {
			expect(replaceExtension('test', '.css')).toBe('test.css');
		});

		it('should handle empty extensions', () => {
			expect(replaceExtension('test.js', '')).toBe('test');
		});

		it('should handle multiple dots in filename', () => {
			expect(replaceExtension('test.config.js', '.css')).toBe('test.config.css');
		});
	});
});
