module.exports = {
    semi: true,
    tabWidth: 4,
    htmlWhitespaceSensitivity: "ignore",
    plugins: [require.resolve("prettier-plugin-astro")],
    overrides: [
        {
            files: "*.astro",
            options: {
                parser: "astro",
            },
        },
    ],
};
