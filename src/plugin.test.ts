import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import {describe, it, expect, vi} from 'vitest';
import {type OutputBundleLike} from './css-collector';
import createVitePluginMergeCss from './index';
import * as vite from 'vite';

const createTempBuildDir = async (): Promise<{rootDir: string; srcDir: string; outDir: string}> => {
	const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vite-plugin-merge-css-'));
	const srcDir = path.join(rootDir, 'src');
	const outDir = path.join(rootDir, 'dist');

	await fs.mkdir(srcDir, {recursive: true});

	return {rootDir, srcDir, outDir};
};

const buildFixture = async (input: string | Record<string, string>, outDir: string): Promise<void> => {
	const options = {input, output: {entryFileNames: '[name].js'}};
	// Vite 7 needs Rollup options; Vite 8 deprecates that key in favor of Rolldown.
	const bundlerOptions = vite.version.startsWith('7.') ? {rollupOptions: options} : {rolldownOptions: options};

	await vite.build({
		logLevel: 'silent',
		build: {
			...bundlerOptions,
			manifest: true,
			cssCodeSplit: true,
			outDir,
			emptyOutDir: true,
			minify: false,
		},
		plugins: [createVitePluginMergeCss()],
	});
};

type BundleHookContext = {
	readonly warn: (warning: string) => void;
	readonly emitFile: (file: vite.Rollup.EmittedAsset) => string;
};

const callGenerateBundle = async (plugin: vite.Plugin, context: BundleHookContext, bundle: OutputBundleLike): Promise<void> => {
	const {generateBundle} = plugin;
	if (typeof generateBundle !== 'function') {
		throw new TypeError('Expected a generateBundle function');
	}

	// This hook only needs warn and emitFile from the context and does not read output options.
	await Reflect.apply(generateBundle, context, [{}, bundle, false]);
};

describe('vite-plugin-merge-css', () => {
	it('configures plugin with post enforcement', () => {
		expect.assertions(1);
		const plugin = createVitePluginMergeCss();

		expect(plugin.enforce).toBe('post');
	});

	it('transforms code that does not need the plugin', async () => {
		expect.assertions(1);
		const {srcDir, outDir} = await createTempBuildDir();

		const inputFile = path.resolve(path.join(srcDir, 'input.ts'));
		await fs.writeFile(inputFile, 'console.log("test");');

		await buildFixture(inputFile, outDir);

		await expect(fs.readFile(path.join(outDir, 'input.js'), 'utf8')).resolves.toContain('console.log("test");');
	});

	it('includes shared css for each entry when imports are deduplicated', async () => {
		expect.assertions(2);
		const {srcDir, outDir} = await createTempBuildDir();

		const sharedCss = path.join(srcDir, 'shared.css');
		const sharedTs = path.join(srcDir, 'shared.ts');
		const entryATs = path.join(srcDir, 'entry-a.ts');
		const entryBTs = path.join(srcDir, 'entry-b.ts');

		await fs.writeFile(sharedCss, '.shared-style { color: rgb(12, 34, 56); }\n');
		await fs.writeFile(sharedTs, "import './shared.css';\nexport const shared = 'shared';\n");
		await fs.writeFile(entryATs, "import {shared} from './shared';\nconsole.log(shared);\n");
		await fs.writeFile(entryBTs, "import './shared.css';\nimport {shared} from './shared';\nconsole.log(shared);\n");

		await buildFixture({entry_a: entryATs, entry_b: entryBTs}, outDir);

		await expect(fs.readFile(path.join(outDir, 'entry_a.css'), 'utf8')).resolves.toContain('.shared-style');
		await expect(fs.readFile(path.join(outDir, 'entry_b.css'), 'utf8')).resolves.toContain('.shared-style');
	});

	it('transforms code from example', async () => {
		expect.assertions(5);
		const {outDir} = await createTempBuildDir();
		await buildFixture(
			{
				page_a: path.resolve('example/src/page_a/index.ts'),
				page_b: path.resolve('example/src/page_b/index.ts'),
			},
			outDir,
		);

		await expect(fs.readFile(path.join(outDir, 'page_a.js'), 'utf8')).resolves.toContain('document.getElementById');
		const pageACss = await fs.readFile(path.join(outDir, 'page_a.css'), 'utf8');
		expect(pageACss).toContain('background: white; /* white background */');

		await expect(fs.readFile(path.join(outDir, 'page_b.js'), 'utf8')).resolves.toContain('document.getElementById');
		const pageBCss = await fs.readFile(path.join(outDir, 'page_b.css'), 'utf8');
		expect(pageBCss).toContain('background: grey; /* grey background */');

		const clockStyle: unknown = expect.stringContaining('color: lightgray; /* clock has lightgrey color */');
		expect([pageACss, pageBCss]).toStrictEqual([clockStyle, clockStyle]);
	});

	it('handles missing css asset', async () => {
		expect.assertions(2);
		const plugin = createVitePluginMergeCss();
		const warnSpy = vi.fn<(warning: string) => void>();
		const emitSpy = vi.fn<BundleHookContext['emitFile']>(() => 'css-asset');

		const bundle: OutputBundleLike = {
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
				sourcemapFileName: null,
				viteMetadata: {
					importedCss: new Set(['missing.css']),
					importedAssets: new Set<string>(),
					__modules: {},
				},
			},
		};

		await callGenerateBundle(plugin, {warn: warnSpy, emitFile: emitSpy}, bundle);

		expect(warnSpy).toHaveBeenCalledWith('CSS file "missing.css" referenced but not found in bundle');
		const emittedCss: unknown = expect.stringContaining('/* vide-plugin-merge-css generated on');
		expect(emitSpy).toHaveBeenCalledWith({
			type: 'asset',
			fileName: 'entry.css',
			source: emittedCss,
		});
	});

	it('warns when referenced css output is a chunk', async () => {
		expect.assertions(2);
		const plugin = createVitePluginMergeCss();
		const warnSpy = vi.fn<(warning: string) => void>();
		const emitSpy = vi.fn<BundleHookContext['emitFile']>(() => 'css-asset');

		const bundle: OutputBundleLike = {
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
				sourcemapFileName: null,
				viteMetadata: {
					importedCss: new Set(['styles.css']),
					importedAssets: new Set<string>(),
					__modules: {},
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
				sourcemapFileName: null,
			},
		};

		await callGenerateBundle(plugin, {warn: warnSpy, emitFile: emitSpy}, bundle);

		expect(warnSpy).toHaveBeenCalledWith('CSS file "styles.css" referenced but not found in bundle');
		const emittedCss: unknown = expect.stringContaining('/* vide-plugin-merge-css generated on');
		expect(emitSpy).toHaveBeenCalledWith({
			type: 'asset',
			fileName: 'entry.css',
			source: emittedCss,
		});
	});
});
