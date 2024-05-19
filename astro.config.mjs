import mdx from "@astrojs/mdx";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";
import rehypePrism from "rehype-prism-plus";

// https://astro.build/config
export default defineConfig({
	integrations: [
		tailwind(),
		starlight({ title: "Nartc - Personal Blog" }),
		mdx(),
	],
	site: "https://nartc.me/",
	markdown: {
		syntaxHighlight: "prism",
		rehypePlugins: [[rehypePrism, { showLineNumbers: true }]],
		remarkPlugins: [],
	},
});
