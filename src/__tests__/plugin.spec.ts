import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import {describe, it, expect} from 'vitest';
import VitePluginMergeCss from '../index';
import * as vite from 'vite';

const expectFileToContain = async (outDir: string, filename: string, content: string | string[]): Promise<void> => {
	const output = await fs.readFile(path.join(outDir, filename), 'utf-8');

	if (Array.isArray(content)) {
		for (const i of content) {
			expect(output).toContain(i);
		}
	} else {
		expect(output).toContain(content);
	}
};

describe('VitePluginMergeCss', () => {
	it('transforms code that does not need the plugin', async () => {
		const tempDir = os.tmpdir();

		const outDir = path.join(tempDir, 'vite-plugin-merge-css', 'dist');
		await fs.mkdir(outDir, {recursive: true});

		const srcDir = path.join(tempDir, 'vite-plugin-merge-css', 'src');
		await fs.mkdir(srcDir, {recursive: true});

		const inputFile = path.resolve(path.join(srcDir, 'input.ts'));
		await fs.writeFile(inputFile, 'console.log("test");');

		await vite.build({
			logLevel: 'silent',
			build: {
				manifest: true,
				rollupOptions: {
					input: inputFile,
					output: {
						entryFileNames: '[name].js',
					},
				},
				cssCodeSplit: true,
				outDir,
				emptyOutDir: true,
				minify: false,
			},
			plugins: [VitePluginMergeCss()],
		});

		await expectFileToContain(outDir, 'input.js', 'console.log("test");');
	});

	it('transforms code from example', async () => {
		const tempDir = os.tmpdir();

		const outDir = path.join(tempDir, 'vite-plugin-merge-css', 'dist');
		await fs.mkdir(outDir, {recursive: true});

		await vite.build({
			logLevel: 'silent',
			build: {
				manifest: true,
				rollupOptions: {
					input: {
						page_a: path.resolve('example/src/page_a/index.ts'),
						page_b: path.resolve('example/src/page_b/index.ts'),
					},
					output: {
						entryFileNames: '[name].js',
					},
				},
				cssCodeSplit: true,
				outDir,
				emptyOutDir: true,
				minify: false,
			},
			plugins: [VitePluginMergeCss()],
		});

		await expectFileToContain(outDir, 'page_a.js', 'document.getElementById');
		await expectFileToContain(outDir, 'page_a.css', ['background: white; /* white background */', 'color: lightgray; /* clock has lightgrey color */']);

		await expectFileToContain(outDir, 'page_b.js', 'document.getElementById');
		await expectFileToContain(outDir, 'page_b.css', ['background: grey; /* grey background */', 'color: lightgray; /* clock has lightgrey color */']);
	});

	it('invalid options', async () => {
		const tempDir = os.tmpdir();

		const outDir = path.join(tempDir, 'vite-plugin-merge-css', 'dist');
		await fs.mkdir(outDir, {recursive: true});

		const srcDir = path.join(tempDir, 'vite-plugin-merge-css', 'src');
		await fs.mkdir(srcDir, {recursive: true});

		const inputFile = path.resolve(path.join(srcDir, 'input.ts'));
		await fs.writeFile(inputFile, 'console.log("test");');

		const warnings: vite.Rollup.RollupLog[] = [];
		await vite.build({
			logLevel: 'silent',
			build: {
				//manifest: true,
				rollupOptions: {
					input: inputFile,
					output: {
						entryFileNames: '[name].js',
					},
					onwarn(warning, warn) {
						warnings.push(warning);
						warn(warning);
					},
				},
				cssCodeSplit: true,
				outDir,
				emptyOutDir: true,
				minify: false,
			},
			plugins: [VitePluginMergeCss()],
		});

		expect(warnings).toHaveLength(1);
		expect(warnings[0].message).toBe('[plugin vite-plugin-merge-css] The build option "manifest" must be enabled');
	});
});
