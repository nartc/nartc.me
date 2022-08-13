import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

import image from "@astrojs/image";

// https://astro.build/config
export default defineConfig({
    integrations: [tailwind(), image()],
    site: "https://nartc.me",
    markdown: {
        shikiConfig: {
            theme: "dark-plus",
        },
    },
});
