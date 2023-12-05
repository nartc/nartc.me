module.exports = {
	semi: true,
	useTabs: true,
	htmlWhitespaceSensitivity: "ignore",
	plugins: [
		require.resolve("prettier-plugin-astro"),
		require.resolve("prettier-plugin-organize-imports"),
		require.resolve("prettier-plugin-tailwindcss"),
	],
	overrides: [
		{
			files: "*.astro",
			options: {
				parser: "astro",
			},
		},
	],
};
