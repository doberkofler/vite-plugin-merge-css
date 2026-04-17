import {createCssCollector, type OutputBundleLike, type ViteOutputChunk, type ViteMetadata} from './css-collector';
import {describe, it, expect} from 'vitest';

const createViteMetadata = (importedCss: string[], importedAssets: string[]): ViteMetadata => ({
	importedCss: new Set(importedCss),
	importedAssets: new Set(importedAssets),
	__modules: {},
});

const createEntryChunk = (options: {name: string; viteMetadata?: ViteMetadata; imports?: string[]}): ViteOutputChunk => {
	const {name, viteMetadata, imports = []} = options;

	const filename = `${name}.js`;
	const entryChunk: ViteOutputChunk = {
		code: '// js code',
		dynamicImports: [],
		exports: [],
		facadeModuleId: filename,
		isEntry: true,
		isDynamicEntry: false,
		name,
		map: null,
		fileName: filename,
		imports,
		moduleIds: [],
		modules: {},
		preliminaryFileName: filename,
		sourcemapFileName: null,
		type: 'chunk',
	};

	if (viteMetadata) {
		entryChunk.viteMetadata = viteMetadata;
	}

	return entryChunk;
};

describe('createCssCollector', () => {
	it('no css file', () => {
		const cssCollector = createCssCollector();
		const entryChunk = createEntryChunk({name: 'file'});
		expect(cssCollector.getCacheSize()).toBe(0);
		const cssFiles = cssCollector.getCssFilesForChunk(entryChunk, {});
		expect(cssFiles).toStrictEqual([]);
		expect(cssCollector.getCacheSize()).toBe(1);
	});

	it('import local css file', () => {
		const cssCollector = createCssCollector();
		const entryChunk = createEntryChunk({name: 'file', viteMetadata: createViteMetadata(['file.css'], [])});

		const cssFiles = cssCollector.getCssFilesForChunk(entryChunk, {});
		expect(cssFiles).toStrictEqual(['file.css']);
		expect(cssCollector.getCacheSize()).toBe(1);
	});

	it('import local css file and css file in import', () => {
		const cssCollector = createCssCollector();
		const entryChunk = createEntryChunk({name: 'file', viteMetadata: createViteMetadata(['file.css'], []), imports: ['lib']});
		const bundle: OutputBundleLike = {
			lib: createEntryChunk({name: 'lib', viteMetadata: createViteMetadata(['lib.css'], [])}),
		};

		const cssFiles = cssCollector.getCssFilesForChunk(entryChunk, bundle);
		expect(cssFiles).toStrictEqual(['lib.css', 'file.css']);
		expect(cssCollector.getCacheSize()).toBe(2);
	});

	it('invalid import', () => {
		const cssCollector = createCssCollector();
		const entryChunk = createEntryChunk({name: 'file', viteMetadata: createViteMetadata(['file.css'], []), imports: ['lib']});

		expect(() => {
			cssCollector.getCssFilesForChunk(entryChunk, {});
		}).toThrow('Unable to find chunk "lib" in bundle');
	});

	it('invalid chunck', () => {
		const cssCollector = createCssCollector();
		const invalidMetadata = createViteMetadata([], []);
		Reflect.set(invalidMetadata, 'importedCss', ['file.css']);
		const entryChunk = createEntryChunk({
			name: 'file',
			viteMetadata: invalidMetadata,
			imports: [],
		});

		expect(() => {
			cssCollector.getCssFilesForChunk(entryChunk, {});
		}).toThrow('The entry chunk with fileName "file.js" has a "viteMetadata.importedCss" property of type "[object Array]" but should be Set');
	});

	it('circular dependency', () => {
		const cssCollector = createCssCollector();
		const chunkA = createEntryChunk({name: 'chunkA', imports: ['chunkB.js']});
		const chunkB = createEntryChunk({name: 'chunkB', imports: ['chunkA.js']});
		const bundle: OutputBundleLike = {
			'chunkA.js': chunkA,
			'chunkB.js': chunkB,
		};

		const cssFiles = cssCollector.getCssFilesForChunk(chunkA, bundle);
		expect(cssFiles).toStrictEqual([]);
	});

	it('duplicate css across shared imports', () => {
		const cssCollector = createCssCollector();
		const shared = createEntryChunk({name: 'shared', viteMetadata: createViteMetadata(['shared.css'], [])});
		const libA = createEntryChunk({name: 'libA', viteMetadata: createViteMetadata(['shared.css'], []), imports: ['shared.js']});
		const libB = createEntryChunk({name: 'libB', viteMetadata: createViteMetadata(['shared.css'], []), imports: ['shared.js']});
		const entry = createEntryChunk({name: 'entry', imports: ['libA.js', 'libB.js']});

		const bundle: OutputBundleLike = {
			'shared.js': shared,
			'libA.js': libA,
			'libB.js': libB,
			'entry.js': entry,
		};

		const cssFiles = cssCollector.getCssFilesForChunk(entry, bundle);
		expect(cssFiles).toStrictEqual(['shared.css']);
	});

	it('includes shared chunk own css when chunk is cached', () => {
		const cssCollector = createCssCollector();
		const dep = createEntryChunk({name: 'dep', viteMetadata: createViteMetadata(['dep.css'], [])});
		const shared = createEntryChunk({name: 'shared', viteMetadata: createViteMetadata(['shared.css'], []), imports: ['dep.js']});
		const entryA = createEntryChunk({name: 'entryA', imports: ['shared.js']});
		const entryB = createEntryChunk({name: 'entryB', imports: ['shared.js']});

		const bundle: OutputBundleLike = {
			'dep.js': dep,
			'shared.js': shared,
			'entryA.js': entryA,
			'entryB.js': entryB,
		};

		const cssFilesEntryA = cssCollector.getCssFilesForChunk(entryA, bundle);
		expect(cssFilesEntryA).toStrictEqual(['dep.css', 'shared.css']);

		const cssFilesEntryB = cssCollector.getCssFilesForChunk(entryB, bundle);
		expect(cssFilesEntryB).toStrictEqual(['dep.css', 'shared.css']);
	});

	it('includes css from shared dependency regardless of prior traversal order', () => {
		const cssCollector = createCssCollector();
		const x = createEntryChunk({name: 'x', viteMetadata: createViteMetadata(['x.css'], [])});
		const a = createEntryChunk({name: 'a', imports: ['x.js']});
		const b = createEntryChunk({name: 'b', viteMetadata: createViteMetadata(['b.css'], []), imports: ['x.js']});
		const entry1 = createEntryChunk({name: 'entry1', imports: ['a.js', 'b.js']});
		const entry2 = createEntryChunk({name: 'entry2', imports: ['b.js']});

		const bundle: OutputBundleLike = {
			'x.js': x,
			'a.js': a,
			'b.js': b,
			'entry1.js': entry1,
			'entry2.js': entry2,
		};

		const cssFilesEntry1 = cssCollector.getCssFilesForChunk(entry1, bundle);
		expect(cssFilesEntry1).toStrictEqual(['x.css', 'b.css']);

		const cssFilesEntry2 = cssCollector.getCssFilesForChunk(entry2, bundle);
		expect(cssFilesEntry2).toStrictEqual(['x.css', 'b.css']);
	});

	it('cached result with seen css', () => {
		const cssCollector = createCssCollector();
		const lib = createEntryChunk({name: 'lib', viteMetadata: createViteMetadata(['common.css'], [])});
		const entry = createEntryChunk({name: 'entry', imports: ['lib.js']});

		const bundle: OutputBundleLike = {
			'lib.js': lib,
			'entry.js': entry,
		};

		// First call populates cache
		cssCollector.getCssFilesForChunk(entry, bundle);

		// Second call should use cache and respect seenCss
		const seenCss = new Set(['common.css']);
		const cssFiles = cssCollector.getCssFilesForChunk(entry, bundle, new Set(), seenCss);
		expect(cssFiles).toStrictEqual([]);
	});

	it('returns empty list when chunk is already seen in caller context', () => {
		const cssCollector = createCssCollector();
		const entry = createEntryChunk({name: 'entry', viteMetadata: createViteMetadata(['entry.css'], [])});

		const cssFiles = cssCollector.getCssFilesForChunk(entry, {}, new Set(['entry.js']));
		expect(cssFiles).toStrictEqual([]);
	});

	it('handles imports without css', () => {
		const cssCollector = createCssCollector();
		const entry = createEntryChunk({name: 'entry', imports: ['no-css.js']});
		const bundle: OutputBundleLike = {
			'no-css.js': createEntryChunk({name: 'no-css'}),
		};

		const cssFiles = cssCollector.getCssFilesForChunk(entry, bundle);
		expect(cssFiles).toStrictEqual([]);
	});

	it('ignores imported bundle entries that are not chunks', () => {
		const cssCollector = createCssCollector();
		const entry = createEntryChunk({name: 'entry', imports: ['asset.dat']});
		const bundle: OutputBundleLike = {
			'asset.dat': {
				type: 'asset',
				fileName: 'asset.dat',
				source: 'payload',
			},
		};

		const cssFiles = cssCollector.getCssFilesForChunk(entry, bundle);
		expect(cssFiles).toStrictEqual([]);
	});

	it('clears cache', () => {
		const cssCollector = createCssCollector();
		const entry = createEntryChunk({name: 'entry'});
		cssCollector.getCssFilesForChunk(entry, {});
		expect(cssCollector.getCacheSize()).toBe(1);
		cssCollector.clearCache();
		expect(cssCollector.getCacheSize()).toBe(0);
	});
});
