import {type PluginContext} from 'rollup';
import fs from 'node:fs/promises';
import path from 'node:path';
import {collectCSS, type ManifestType} from './manifest';

const getBaseName = (filename: string): string => filename.replace(/\.[^.]+$/, '');

export type EntryType = {
	file: string;
	css: string[];
};

export const extractEntries = (manifest: ManifestType): EntryType[] => {
	const entries: EntryType[] = [];

	for (const [key, value] of Object.entries(manifest)) {
		if (value.isEntry) {
			const visited = new Set<string>();
			const cssFiles = collectCSS(manifest, key, visited);
			entries.push({
				file: value.file,
				css: Array.from(new Set(cssFiles)), // Remove duplicates
			});
		}
	}

	return entries.sort((a, b) => a.file.localeCompare(b.file));
};

export const mergeCSS = async (pluginContext: PluginContext, entries: EntryType[], outputDir: string): Promise<number> => {
	let countWritten = 0;

	for (const entry of entries) {
		const jsFileName = entry.file;
		const baseName = getBaseName(jsFileName);
		const mergedCssPath = path.resolve(outputDir, `${baseName}.css`);

		let mergedCss = '';

		for (const cssRelPath of entry.css ?? []) {
			const cssAbsPath = path.resolve(outputDir, cssRelPath);
			try {
				const cssContent = await fs.readFile(cssAbsPath, 'utf-8');
				mergedCss += cssContent + '\n';
			} catch (e: unknown) {
				pluginContext.warn(`Failed to read CSS file "${cssRelPath}" for "${jsFileName}".`);
			}
		}

		try {
			await fs.writeFile(mergedCssPath, mergedCss, 'utf-8');
			pluginContext.info(`Wrote merged CSS: ${path.basename(mergedCssPath)}`);
			countWritten++;
		} catch (e: unknown) {
			pluginContext.warn(`Failed to write merged CSS to "${mergedCssPath}".`);
		}
	}

	return countWritten;
};
