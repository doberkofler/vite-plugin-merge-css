import {createCssCollector, type ViteOutputChunk, type ViteMetadata} from '../css-collector';
import type {Rollup} from 'vite';
import {describe, it, expect} from 'vitest';

const createViteMetadata = (importedCss: string[], importedAssets: string[]): ViteMetadata => ({
	importedCss: new Set(importedCss),
	importedAssets: new Set(importedAssets),
});

const createEntryChunk = (options: {name: string; viteMetadata?: ViteMetadata; imports?: string[]}): ViteOutputChunk => {
	const {name, viteMetadata, imports = []} = options;

	const filename = `${name}.js`;
	const entryChunk: ViteOutputChunk = {
		code: '// js code',
		map: null,
		sourcemapFileName: null,
		preliminaryFileName: filename,
		dynamicImports: [],
		fileName: filename,
		implicitlyLoadedBefore: [],
		importedBindings: {},
		imports,
		modules: {},
		referencedFiles: [],
		exports: [],
		facadeModuleId: filename,
		isDynamicEntry: false,
		isEntry: true,
		isImplicitEntry: false,
		moduleIds: [],
		name: name,
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
		const bundle: Rollup.OutputBundle = {
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
		const entryChunk = createEntryChunk({
			name: 'file',
			viteMetadata: {importedCss: ['file.css'] as unknown as Set<string>, importedAssets: new Set()},
			imports: [],
		});

		expect(() => {
			cssCollector.getCssFilesForChunk(entryChunk, {});
		}).toThrow('The entry chunk with fileName "file.js" has a "viteMetadata.importedCss" property of type "[object Array]" but should be Set');
	});
});
