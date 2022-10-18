import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";
import image from "@astrojs/image";
import mdx from "@astrojs/mdx";
import analogjsangular from "@analogjs/astro-angular";

// https://astro.build/config
export default defineConfig({
    integrations: [tailwind(), image(), mdx(), analogjsangular()],
    site: "https://nartc.me",
    markdown: {
        shikiConfig: {
            theme: "dark-plus",
        },
    },
});
