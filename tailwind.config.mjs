import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
	theme: {
		extend: {
			fontFamily: {
				sans: ["Inter", ...fontFamily.sans],
				mono: ["DM Mono", ...fontFamily.mono],
			},
			minHeight: {
				128: "32rem",
			},
			boxShadow: {
				common: "var(--shadow)",
			},
			colors: {
				primary: "var(--primary)",
				secondary: "var(--secondary)",
				"gray-light": "var(--gray-light)",
				"gray-medium": "var(--gray-medium)",
				"gray-dark": "var(--gray-dark)",
				text: "var(--text-color)",
				"code-background": "var(--code-background)",
			},
		},
	},
};
