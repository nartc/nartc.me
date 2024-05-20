import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
	const blogs = await getCollection("blogs");
	return rss({
		title: "Chau Tran blog",
		description: "Personal blog of Chau Tran (nartc)",
		site: context.site,
		items: blogs
			.filter((blog) => !blog.data.draft)
			.map((blog) => ({
				title: blog.data.title,
				link: context.url.origin + `/blog/${blog.slug}`,
				pubDate: blog.data.publishedAt,
				description: blog.data.description,
			})),
		stylesheet: "/rss/styles.xsl",
	});
}
