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
