import path from 'node:path';
import {type Plugin} from 'vite';
import {loadManifest} from './manifest';
import {extractEntries, mergeCSS} from './merge';
import {cleanupCss} from './cleanup';

export type VitePluginMergeCss = {
	/**
	 * Optional flag, if the unused chunks should be removed.
	 * @default true.
	 */
	cleanup?: boolean;
};

/**
 * A vite plugin that automatically merges all css chunks for each entry point into a single css file.
 * @param [options] - The plugin options.
 */
const VitePluginMergeCss = (options: VitePluginMergeCss = {}): Plugin => {
	let _manifestFilePath: string;
	let _outDir: string;

	return {
		name: 'vite-plugin-merge-css',
		apply: 'build',

		configResolved(config) {
			if (config.build.manifest === false) {
				this.error('The build option "manifest" must be enabled');
			}

			_outDir = config.build.outDir;
			_manifestFilePath = path.resolve(_outDir, typeof config.build.manifest === 'string' ? config.build.manifest : '.vite/manifest.json');
		},

		async closeBundle() {
			// load manifest
			const manifest = await loadManifest(this, _manifestFilePath);

			// load entries with all css dependencies
			const entries = extractEntries(manifest);

			// merge css
			const countWritten = await mergeCSS(this, entries, _outDir);

			// clean up original split CSS files
			const removeCount = (options.cleanup ?? true) ? await cleanupCss(this, manifest, _outDir) : 0;

			this.info(`Wrote ${countWritten} merged CSS files and removed ${removeCount} CSS files.`);
		},
	};
};

export default VitePluginMergeCss;
