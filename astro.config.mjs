import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";
import image from "@astrojs/image";

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), image(), mdx()],
  site: "https://nartc.me",
  markdown: {
    shikiConfig: {
      theme: "dark-plus"
    }
  }
});