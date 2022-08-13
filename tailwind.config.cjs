const { fontFamily, spacing } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
    theme: {
        fontFamily: {
            sans: ["Source Sans Pro", ...fontFamily.sans],
        },
        extend: {
            colors: {
                primary: "var(--primary)",
                secondary: "var(--secondary)",
                "gray-light": "var(--gray-light)",
                "gray-medium": "var(--gray-medium)",
                "gray-dark": "var(--gray-dark)",
                text: "var(--text-color)",
            },
        },
    },
    plugins: [],
};
