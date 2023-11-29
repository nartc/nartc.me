import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import rehypePrism from "rehype-prism-plus";

// https://astro.build/config
export default defineConfig({
    integrations: [tailwind(), mdx()],
    site: "https://nartc.me/",
    markdown: {
        syntaxHighlight: "prism",
        rehypePlugins: [[rehypePrism, { showLineNumbers: true }]],
        remarkPlugins: [],
    },
});
