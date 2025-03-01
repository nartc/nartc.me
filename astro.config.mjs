import mdx from "@astrojs/mdx";
import starlight from "@astrojs/starlight";
import tailwind from "@astrojs/tailwind";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import expressiveCode from "astro-expressive-code";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({ title: "Nartc - Personal Blog" }),
		expressiveCode({
			themes: ["github-dark", "github-light"],
			plugins: [pluginLineNumbers()],
			styleOverrides: {
				codeFontFamily: "'DM Mono'",
				codeFontSize: "1rem",
			},
		}),
		mdx(),
		tailwind(),
	],
	site: "https://nartc.me/",
});
