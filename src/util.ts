import path from 'node:path';

export const replaceExtension = (filePath: string, newExt: string): string => {
	const parsed = path.parse(filePath);
	return path.format({
		dir: parsed.dir,
		name: parsed.name,
		ext: newExt,
	});
};
