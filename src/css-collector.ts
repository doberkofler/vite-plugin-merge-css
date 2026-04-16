import type {Rollup} from 'vite';

/**
 * Vite-specific metadata attached to output chunks
 */
export type ViteMetadata = {
	importedCss: Set<string>;
	importedAssets: Set<string>;
};

/**
 * Extended OutputChunk type that includes Vite-specific metadata
 */
export type ViteOutputChunk = Rollup.OutputChunk & {
	viteMetadata?: ViteMetadata;
};

/**
 * Type definition for the CSS collector instance
 */
export type CssCollector = {
	getCssFilesForChunk: (entryChunk: ViteOutputChunk, bundle: Rollup.OutputBundle, seenChunks?: Set<string>, seenCss?: Set<string>) => string[];
	clearCache: () => void;
	getCacheSize: () => number;
};

/**
 * Factory function that creates a CSS file collector with its own cache
 * @returns Object containing the collector function and cache management methods
 */
export const createCssCollector = (): CssCollector => {
	const analyzedImportedCssFiles = new Map<ViteOutputChunk, string[]>();

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

	const collectCompleteCssFilesForChunk = (entryChunk: ViteOutputChunk, bundle: Rollup.OutputBundle, recursionStack: Set<string> = new Set()): string[] => {
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

		entryChunk.imports.forEach((file) => {
			const importee = bundle[file];
			if (!importee) {
				throw new Error(`Unable to find chunk "${file}" in bundle`);
			}
			if (importee.type === 'chunk') {
				files.push(...collectCompleteCssFilesForChunk(importee as ViteOutputChunk, bundle, nextRecursionStack));
			}
		});

		if (entryChunk.viteMetadata?.importedCss) {
			// For compatibility reasons, we check if "importedCss" really is a "Set"
			const className = Object.prototype.toString.call(entryChunk.viteMetadata?.importedCss);
			if (className !== '[object Set]') {
				throw new Error(
					`The entry chunk with fileName "${entryChunk.fileName}" has a "viteMetadata.importedCss" property of type "${className}" but should be Set`,
				);
			}

			entryChunk.viteMetadata.importedCss.forEach((file) => {
				files.push(file);
			});
		}

		const completeChunkCssFiles = uniqueFiles(files);
		analyzedImportedCssFiles.set(entryChunk, completeChunkCssFiles);

		return completeChunkCssFiles;
	};

	/**
	 * Collects CSS for a chunk and filters already seen CSS files for the caller context.
	 *
	 * @param entryChunk - The chunk to analyze for CSS imports
	 * @param bundle - The complete Rollup output bundle
	 * @param seenChunks - Set tracking visited chunks in caller context
	 * @param seenCss - Set tracking already collected CSS files to prevent duplicates
	 * @returns Array of CSS file names in dependency order
	 */
	const getCssFilesForChunk = (
		entryChunk: ViteOutputChunk,
		bundle: Rollup.OutputBundle,
		seenChunks: Set<string> = new Set(),
		seenCss: Set<string> = new Set(),
	): string[] => {
		if (seenChunks.has(entryChunk.fileName)) {
			return [];
		}
		seenChunks.add(entryChunk.fileName);

		const completeChunkCssFiles = collectCompleteCssFilesForChunk(entryChunk, bundle);

		const filteredFiles: string[] = [];
		completeChunkCssFiles.forEach((file) => {
			if (!seenCss.has(file)) {
				seenCss.add(file);
				filteredFiles.push(file);
			}
		});

		return filteredFiles;
	};

	/**
	 * Clears the internal cache
	 * Useful for testing or when bundle analysis needs to be reset
	 */
	const clearCache = (): void => analyzedImportedCssFiles.clear();

	/**
	 * Gets the current cache size
	 * @returns Number of cached chunk analyses
	 */
	const getCacheSize = (): number => analyzedImportedCssFiles.size;

	return {
		getCssFilesForChunk,
		clearCache,
		getCacheSize,
	};
};
