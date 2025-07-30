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
        manifest: true, // must be enabled for the plugin to work
        rollupOptions: {
            input: {
                // using multiple pages
                page_a: 'src/page_a/index.ts',
                page_b: 'src/page_b/index.ts',
            },
            output: {
                entryFileNames: '[name].js',
            },
        },
        cssCodeSplit: true, // create a css file per entry point
    },
    plugins: [VitePluginMergeCss()],
};
```

## Options

```ts
export type VitePluginMergeCss = {
    /**
     * Optional flag if the unused chunks should be removed.
     * @default true.
     */
    cleanup?: boolean;
};
```
