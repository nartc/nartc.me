import type { CollectionEntry } from "astro:content";

export function byDate(
	a: CollectionEntry<"blogs">,
	b: CollectionEntry<"blogs">,
) {
	return b.data.publishedAt.getTime() - a.data.publishedAt.getTime();
}
