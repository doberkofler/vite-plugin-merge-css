import {type Plugin, type Rollup} from 'vite';
import {createCssCollector} from './css-collector';
import {replaceExtension} from './util';
import debugLib from 'debug';

const debug = debugLib('vite-plugin-merge-css');

/**
 * A vite plugin that automatically merges all css chunks for each entry point into a single css file.
 * @returns {Plugin} Vite plugin instance.
 */
const VitePluginMergeCss = (): Plugin => {
	const cssCollector = createCssCollector();

	return {
		name: 'vite-plugin-merge-css',
		apply: 'build',

		generateBundle(_options, bundle) {
			const startTime = Date.now();

			// Find all entry chunks
			const entryChunks = Object.values(bundle).filter((output): output is Rollup.OutputChunk => output.type === 'chunk' && output.isEntry);

			for (const entryChunk of entryChunks) {
				// Collect all CSS files for this entry point
				const cssFiles = cssCollector.getCssFilesForChunk(entryChunk, bundle);

				// Concatenate CSS content from all collected files
				const mergedCssContent = cssFiles
					.map((cssFileName) => {
						if (!(cssFileName in bundle)) {
							this.warn(`CSS file "${cssFileName}" referenced but not found in bundle`);
							return '';
						}

						const cssOutput = bundle[cssFileName];
						if (cssOutput.type !== 'asset') {
							this.warn(`CSS file "${cssFileName}" referenced but not found in bundle`);
							return '';
						}

						return cssOutput.source.toString();
					})
					.filter((content) => content.length > 0)
					.join('\n\n');

				const concatenatedCss = `/* vide-plugin-merge-css generated on ${Date.now().toString()} merging: ${cssFiles.join(', ')} */\n\n${mergedCssContent}`;

				const outputFileName = replaceExtension(entryChunk.fileName, '.css');

				// Emit the concatenated CSS file
				this.emitFile({
					type: 'asset',
					fileName: outputFileName,
					source: concatenatedCss,
				});

				debug(`Generated ${outputFileName} from ${cssFiles.length} CSS file(s)`);
			}

			debug(`Generated ${entryChunks.length} css files in ${((Date.now() - startTime) / 1000).toFixed(2)} seconds.`);
		},
	};
};

export {VitePluginMergeCss};
export default VitePluginMergeCss;
