import {type Plugin} from 'vite';
import {loadManifest} from './manifest';
import {extractEntries, mergeCSS} from './merge';
import {cleanupCss} from './cleanup';

export type VitePluginMergeCss = {
	/**
	 * Directory relative from root where build output will be placed.
	 * @default 'dist'.
	 */
	outDir?: string;

	/**
	 * Optional flag, if the unused chunks should be removed.
	 * @default true.
	 */
	cleanup?: boolean;
};

/**
 * A vite plugin that automatically merges all css chunks for each entry point into a single css file.
 * @param options - The plugin options.
 */
const VitePluginMergeCss = (options: VitePluginMergeCss): Plugin => {
	const outDir: string = options.outDir ?? 'dist';
	const cleanup: boolean = options.cleanup ?? true;

	return {
		name: 'vite-plugin-merge-css',
		apply: 'build',

		async closeBundle() {
			// load manifest
			const manifest = await loadManifest(this, outDir);

			// load entries with all css dependencies
			const entries = extractEntries(manifest);

			// merge css
			const countWritten = await mergeCSS(this, entries, outDir);

			// clean up original split CSS files
			const removeCount = cleanup ? await cleanupCss(this, manifest, outDir) : 0;

			this.info(`Wrote ${countWritten} merged CSS files and removed ${removeCount} CSS files.`);
		},
	};
};

export default VitePluginMergeCss;
