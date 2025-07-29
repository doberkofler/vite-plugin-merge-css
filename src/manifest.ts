import {type PluginContext} from 'rollup';
import fs from 'node:fs/promises';
import path from 'node:path';

export type ManifestEntryType = {
	file: string;
	name: string[];
	src: string;
	isEntry?: boolean;
	isDynamicEntry?: boolean;
	imports?: string[];
	css?: string[];
};
export type ManifestType = Record<string, ManifestEntryType>;

export const loadManifest = async (pluginContext: PluginContext, dir: string): Promise<ManifestType> => {
	const manifestPath = path.resolve(dir, '.vite/manifest.json');

	let manifestRaw: string;
	try {
		manifestRaw = await fs.readFile(manifestPath, 'utf-8');
	} catch {
		pluginContext.error(`Could not read manifest at "${manifestPath}", skipping.`);
	}

	let manifest: ManifestType;
	try {
		manifest = JSON.parse(manifestRaw) as ManifestType;
	} catch {
		pluginContext.error(`Invalid JSON in manifest.`);
	}

	return manifest;
};

export const collectCSS = (manifest: ManifestType, key: string, visited: Set<string>): string[] => {
	if (visited.has(key)) {
		return [];
	}
	visited.add(key);

	const entry = manifest[key];
	if (!entry) {
		return [];
	}

	const css: string[] = [...(entry.css ?? [])];

	for (const imp of entry.imports ?? []) {
		css.push(...collectCSS(manifest, imp, visited));
	}

	return css;
};
