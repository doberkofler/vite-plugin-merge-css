import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import {describe, it, expect, vi} from 'vitest';
import createVitePluginMergeCss from './index';
import * as vite from 'vite';

const expectFileToContain = async (outDir: string, filename: string, content: string | string[]): Promise<void> => {
	const output = await fs.readFile(path.join(outDir, filename), 'utf8');

	if (Array.isArray(content)) {
		for (const i of content) {
			expect(output).toContain(i);
		}
	} else {
		expect(output).toContain(content);
	}
};

const createTempBuildDir = async (): Promise<{rootDir: string; srcDir: string; outDir: string}> => {
	const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vite-plugin-merge-css-'));
	const srcDir = path.join(rootDir, 'src');
	const outDir = path.join(rootDir, 'dist');

	await fs.mkdir(srcDir, {recursive: true});

	return {rootDir, srcDir, outDir};
};

describe('VitePluginMergeCss', () => {
	it('configures plugin with post enforcement', () => {
		const plugin = createVitePluginMergeCss();

		expect(plugin.enforce).toBe('post');
	});

	it('transforms code that does not need the plugin', async () => {
		const {srcDir, outDir} = await createTempBuildDir();

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
			plugins: [createVitePluginMergeCss()],
		});

		await expectFileToContain(outDir, 'input.js', 'console.log("test");');
	});

	it('includes shared css for each entry when imports are deduplicated', async () => {
		const {srcDir, outDir} = await createTempBuildDir();

		const sharedCss = path.join(srcDir, 'shared.css');
		const sharedTs = path.join(srcDir, 'shared.ts');
		const entryATs = path.join(srcDir, 'entry-a.ts');
		const entryBTs = path.join(srcDir, 'entry-b.ts');

		await fs.writeFile(sharedCss, '.shared-style { color: rgb(12, 34, 56); }\n');
		await fs.writeFile(sharedTs, "import './shared.css';\nexport const shared = 'shared';\n");
		await fs.writeFile(entryATs, "import {shared} from './shared';\nconsole.log(shared);\n");
		await fs.writeFile(entryBTs, "import './shared.css';\nimport {shared} from './shared';\nconsole.log(shared);\n");

		await vite.build({
			logLevel: 'silent',
			build: {
				manifest: true,
				rollupOptions: {
					input: {
						entry_a: entryATs,
						entry_b: entryBTs,
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
			plugins: [createVitePluginMergeCss()],
		});

		await expectFileToContain(outDir, 'entry_a.css', '.shared-style');
		await expectFileToContain(outDir, 'entry_b.css', '.shared-style');
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
			plugins: [createVitePluginMergeCss()],
		});

		await expectFileToContain(outDir, 'page_a.js', 'document.getElementById');
		await expectFileToContain(outDir, 'page_a.css', ['background: white; /* white background */', 'color: lightgray; /* clock has lightgrey color */']);

		await expectFileToContain(outDir, 'page_b.js', 'document.getElementById');
		await expectFileToContain(outDir, 'page_b.css', ['background: grey; /* grey background */', 'color: lightgray; /* clock has lightgrey color */']);
	});

	it('handles missing css asset', async () => {
		const plugin = createVitePluginMergeCss();
		const warnSpy = vi.fn<(warning: string) => void>();
		type EmittedFile = {fileName: string; source: string | Uint8Array};
		const emitSpy = vi.fn<(file: EmittedFile) => number>();

		const bundle = {
			'entry.js': {
				type: 'chunk',
				code: '',
				dynamicImports: [],
				exports: [],
				facadeModuleId: null,
				isEntry: true,
				isDynamicEntry: false,
				fileName: 'entry.js',
				imports: [],
				map: null,
				moduleIds: [],
				modules: {},
				name: 'entry',
				preliminaryFileName: 'entry.js',
				referencedFiles: [],
				sourcemapFileName: null,
				viteMetadata: {
					importedCss: new Set(['missing.css']),
					importedAssets: new Set<string>(),
				},
			},
		};

		const context = {
			warn: warnSpy,
			emitFile: emitSpy,
		};

		if (plugin.generateBundle && typeof plugin.generateBundle === 'function') {
			await Reflect.apply(plugin.generateBundle, context, [{}, bundle, false]);
		}

		expect(warnSpy).toHaveBeenCalledWith('CSS file "missing.css" referenced but not found in bundle');
		expect(emitSpy).toHaveBeenCalled();
		const [[emittedFile]] = emitSpy.mock.calls;
		expect(emittedFile.fileName).toBe('entry.css');
		const emittedSource = typeof emittedFile.source === 'string' ? emittedFile.source : new TextDecoder().decode(emittedFile.source);
		expect(emittedSource).toContain('/* vide-plugin-merge-css generated on');
	});

	it('warns when referenced css output is a chunk', async () => {
		const plugin = createVitePluginMergeCss();
		const warnSpy = vi.fn<(warning: string) => void>();
		type EmittedFile = {fileName: string; source: string | Uint8Array};
		const emitSpy = vi.fn<(file: EmittedFile) => number>();

		const bundle = {
			'entry.js': {
				type: 'chunk',
				code: '',
				dynamicImports: [],
				exports: [],
				facadeModuleId: null,
				isEntry: true,
				isDynamicEntry: false,
				fileName: 'entry.js',
				imports: [],
				map: null,
				moduleIds: [],
				modules: {},
				name: 'entry',
				preliminaryFileName: 'entry.js',
				referencedFiles: [],
				sourcemapFileName: null,
				viteMetadata: {
					importedCss: new Set(['styles.css']),
					importedAssets: new Set<string>(),
				},
			},
			'styles.css': {
				type: 'chunk',
				code: '',
				dynamicImports: [],
				exports: [],
				facadeModuleId: null,
				isEntry: false,
				isDynamicEntry: false,
				fileName: 'styles.css',
				imports: [],
				map: null,
				moduleIds: [],
				modules: {},
				name: 'styles',
				preliminaryFileName: 'styles.css',
				referencedFiles: [],
				sourcemapFileName: null,
			},
		};

		const context = {
			warn: warnSpy,
			emitFile: emitSpy,
		};

		if (plugin.generateBundle && typeof plugin.generateBundle === 'function') {
			await Reflect.apply(plugin.generateBundle, context, [{}, bundle, false]);
		}

		expect(warnSpy).toHaveBeenCalledWith('CSS file "styles.css" referenced but not found in bundle');
		expect(emitSpy).toHaveBeenCalled();
		const [[emittedFile]] = emitSpy.mock.calls;
		expect(emittedFile.fileName).toBe('entry.css');
		const emittedSource = typeof emittedFile.source === 'string' ? emittedFile.source : new TextDecoder().decode(emittedFile.source);
		expect(emittedSource).toContain('/* vide-plugin-merge-css generated on');
	});
});
