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

	/**
	 * Recursively collects all CSS files imported by a chunk and its dependencies
	 * Uses post-order traversal to ensure dependency CSS is collected first
	 *
	 * @param entryChunk - The chunk to analyze for CSS imports
	 * @param bundle - The complete Rollup output bundle
	 * @param seenChunks - Set tracking visited chunks to prevent circular dependency issues
	 * @param seenCss - Set tracking already collected CSS files to prevent duplicates
	 * @returns Array of CSS file names in dependency order
	 */
	const getCssFilesForChunk = (
		entryChunk: ViteOutputChunk,
		bundle: Rollup.OutputBundle,
		seenChunks: Set<string> = new Set(),
		seenCss: Set<string> = new Set(),
	): string[] => {
		// Prevent infinite recursion on circular dependencies
		if (seenChunks.has(entryChunk.fileName)) {
			return [];
		}
		seenChunks.add(entryChunk.fileName);

		// Return cached result if available
		const cachedFiles = analyzedImportedCssFiles.get(entryChunk);
		if (cachedFiles) {
			const additionals = cachedFiles.filter((file) => !seenCss.has(file));
			additionals.forEach((file) => seenCss.add(file));
			return additionals;
		}

		const files: string[] = [];

		// Recursively collect CSS from imported chunks (dependencies first)
		entryChunk.imports.forEach((file) => {
			const importee = bundle[file];
			if (!importee) {
				throw new Error(`Unable to find chunk "${file}" in bundle`);
			}
			if (importee.type === 'chunk') {
				files.push(...getCssFilesForChunk(importee as ViteOutputChunk, bundle, seenChunks, seenCss));
			}
		});

		// Cache result for this chunk
		analyzedImportedCssFiles.set(entryChunk, files);

		// Add CSS files directly imported by this chunk
		if (entryChunk.viteMetadata?.importedCss) {
			// For compatibility reasons, we check if "importedCss" really is a "Set"
			const className = Object.prototype.toString.call(entryChunk.viteMetadata?.importedCss);
			if (className !== '[object Set]') {
				throw new Error(
					`The entry chunk with fileName "${entryChunk.fileName}" has a "viteMetadata.importedCss" property of type "${className}" but should be Set`,
				);
			}

			// Process all css imports
			entryChunk.viteMetadata.importedCss.forEach((file) => {
				if (!seenCss.has(file)) {
					seenCss.add(file);
					files.push(file);
				}
			});
		}

		return files;
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
