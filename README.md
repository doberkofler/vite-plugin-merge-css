<h1 align="center">vite-plugin-merge-css - Welcome</h1>

# vite-plugin-merge-css

A vite plugin that automatically merges all css chunks for each entry point into a single css file.

## Install

```
npm install vite-plugin-merge-css --save-dev
```

or

```
yarn add vite-plugin-merge-css --dev
```

## Usage

- modify `vite.config.js`:

```js
// vite.config.js
import VitePluginMergeCss from 'vite-plugin-merge-css';
export default {
    build: {
        outDir: 'dist'
    },
    plugins: [VitePluginMergeCss({outDir: 'dist'})]
}
```

## Options

```ts
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
```
