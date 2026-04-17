import {type Rollup} from 'vite';

const uniqueFiles = (files: string[]): string[] => {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const file of files) {
		if (!seen.has(file)) {
			seen.add(file);
			result.push(file);
		}
	}

	return result;
};

/**
 * Vite-specific metadata attached to output chunks
 */
export type ViteMetadata = {
	importedCss: Set<string>;
	importedAssets: Set<string>;
	__modules: Record<string, unknown>;
};

/**
 * Extended OutputChunk type that includes Vite-specific metadata
 */
export type ViteOutputChunk = {
	type: 'chunk';
	fileName: string;
	imports: string[];
	isEntry: boolean;
	isDynamicEntry: boolean;
	code: string;
	dynamicImports: string[];
	exports: string[];
	facadeModuleId: string | null;
	map: Rollup.SourceMap | null;
	moduleIds: string[];
	modules: Record<string, Rollup.RenderedModule>;
	name: string;
	preliminaryFileName: string;
	sourcemapFileName: string | null;
	viteMetadata?: Rollup.OutputChunk['viteMetadata'] | ViteMetadata;
};

type OutputAssetLike = {
	type: 'asset';
};

export type OutputBundleLike = Record<string, Rollup.OutputAsset | Rollup.OutputChunk | ViteOutputChunk | OutputAssetLike>;

/**
 * Type definition for the CSS collector instance
 */
export type CssCollector = {
	getCssFilesForChunk: (entryChunk: ViteOutputChunk, bundle: OutputBundleLike, seenChunks?: Set<string>, seenCss?: Set<string>) => string[];
	clearCache: () => void;
	getCacheSize: () => number;
};

/**
 * Factory function that creates a CSS file collector with its own cache
 * @returns {CssCollector} Object containing the collector function and cache management methods.
 */
export const createCssCollector = (): CssCollector => {
	const analyzedImportedCssFiles = new Map<ViteOutputChunk, string[]>();

	const collectCompleteCssFilesForChunk = (
		entryChunk: ViteOutputChunk,
		bundle: OutputBundleLike,
		recursionStack: Set<string> = new Set<string>(),
	): string[] => {
		const cachedFiles = analyzedImportedCssFiles.get(entryChunk);
		if (cachedFiles) {
			return cachedFiles;
		}

		if (recursionStack.has(entryChunk.fileName)) {
			return [];
		}

		const nextRecursionStack = new Set(recursionStack);
		nextRecursionStack.add(entryChunk.fileName);

		const files: string[] = [];

		for (const file of entryChunk.imports) {
			if (!(file in bundle)) {
				throw new Error(`Unable to find chunk "${file}" in bundle`);
			}

			const importee = bundle[file];
			if (importee.type === 'chunk') {
				files.push(...collectCompleteCssFilesForChunk(importee, bundle, nextRecursionStack));
			}
		}

		if (entryChunk.viteMetadata) {
			// For compatibility reasons, we check if "importedCss" really is a "Set"
			const className = Object.prototype.toString.call(entryChunk.viteMetadata.importedCss);
			if (className !== '[object Set]') {
				throw new Error(
					`The entry chunk with fileName "${entryChunk.fileName}" has a "viteMetadata.importedCss" property of type "${className}" but should be Set`,
				);
			}

			for (const file of entryChunk.viteMetadata.importedCss) {
				files.push(file);
			}
		}

		const completeChunkCssFiles = uniqueFiles(files);
		analyzedImportedCssFiles.set(entryChunk, completeChunkCssFiles);

		return completeChunkCssFiles;
	};

	/**
	 * Collects CSS for a chunk and filters already seen CSS files for the caller context.
	 *
	 * @param {ViteOutputChunk} entryChunk - The chunk to analyze for CSS imports.
	 * @param {OutputBundleLike} bundle - The complete Rollup output bundle.
	 * @param {Set<string>} seenChunks - Set tracking visited chunks in caller context.
	 * @param {Set<string>} seenCss - Set tracking already collected CSS files to prevent duplicates.
	 * @returns {string[]} Array of CSS file names in dependency order.
	 */
	const getCssFilesForChunk = (
		entryChunk: ViteOutputChunk,
		bundle: OutputBundleLike,
		seenChunks: Set<string> = new Set<string>(),
		seenCss: Set<string> = new Set<string>(),
	): string[] => {
		if (seenChunks.has(entryChunk.fileName)) {
			return [];
		}
		seenChunks.add(entryChunk.fileName);

		const completeChunkCssFiles = collectCompleteCssFilesForChunk(entryChunk, bundle);

		const filteredFiles: string[] = [];
		for (const file of completeChunkCssFiles) {
			if (!seenCss.has(file)) {
				seenCss.add(file);
				filteredFiles.push(file);
			}
		}

		return filteredFiles;
	};

	/**
	 * Clears the internal cache
	 * Useful for testing or when bundle analysis needs to be reset
	 * @returns {void} Nothing.
	 */
	const clearCache = (): void => {
		analyzedImportedCssFiles.clear();
	};

	/**
	 * Gets the current cache size
	 * @returns {number} Number of cached chunk analyses.
	 */
	const getCacheSize = (): number => analyzedImportedCssFiles.size;

	return {
		getCssFilesForChunk,
		clearCache,
		getCacheSize,
	};
};
