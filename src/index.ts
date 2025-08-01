import path from 'node:path';
import {type Plugin} from 'vite';
import {loadManifest} from './manifest';
import {extractEntries, mergeCSS} from './merge';
import {cleanupCss} from './cleanup';
import {intervalToString} from './util';

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
	let _outDir: string;
	let _manifest: string | boolean;

	return {
		name: 'vite-plugin-merge-css',
		apply: 'build',

		configResolved(config) {
			_outDir = config.build.outDir;
			_manifest = config.build.manifest;
		},

		async closeBundle() {
			const startDate = new Date();

			if (_manifest === false) {
				this.warn('The build option "manifest" must be enabled');
				return;
			}

			// load manifest
			const manifestFilePath = path.resolve(_outDir, typeof _manifest === 'string' ? _manifest : '.vite/manifest.json');
			const manifest = await loadManifest(this, manifestFilePath);

			// load entries with all css dependencies
			const entries = extractEntries(manifest);

			// merge css
			const countWritten = await mergeCSS(this, entries, _outDir);

			// clean up original split CSS files
			const removeCount = (options.cleanup ?? true) ? await cleanupCss(this, manifest, _outDir) : 0;

			const elapsed = intervalToString(new Date().getTime() - startDate.getTime());
			this.info(`Merged ${countWritten} and removed ${removeCount} css files in ${elapsed}.`);
		},
	};
};

export default VitePluginMergeCss;
