import {type PluginContext} from 'rollup';
import fs from 'node:fs/promises';
import path from 'node:path';
import {collectCSS, type ManifestType} from './manifest';

export const cleanupCss = async (pluginContext: PluginContext, manifest: ManifestType, outputDir: string): Promise<number> => {
	const cssFilesToKeep: string[] = [];

	// prepare a list of all css files that are used in dynamic entries as they cannot be removed
	for (const [key, value] of Object.entries(manifest)) {
		if (value.isDynamicEntry) {
			const visited = new Set<string>();
			const cssFiles = collectCSS(manifest, key, visited); // Collect all css files recursively
			cssFilesToKeep.push(...cssFiles);
		}
	}
	const cssFilesToKeepDeduped = Array.from(new Set(cssFilesToKeep)); // Remove duplicates

	// prepare a list of all css assets
	const cssFiles: string[] = [];
	for (const [, value] of Object.entries(manifest)) {
		for (const i of value.css ?? []) {
			if (!cssFilesToKeepDeduped.includes(i)) {
				cssFiles.push(i);
			}
		}
	}
	const cssFilesDeduped = Array.from(new Set(cssFiles));

	// remove files
	let removeCount = 0;
	for (const file of cssFilesDeduped) {
		const filePath = path.resolve(outputDir, file);
		try {
			await fs.unlink(filePath);
			pluginContext.debug(`Removed unused CSS: ${file}`);
			removeCount++;
		} catch {
			pluginContext.warn(`Unable to remove unused CSS file "${file}".`);
		}
	}

	return removeCount;
};
