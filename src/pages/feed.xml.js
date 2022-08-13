import rss from "@astrojs/rss";

const globImportResult = import.meta.glob("../blogs/*.md", { eager: true });
const globs = Object.values(globImportResult);

export const get = () =>
    rss({
        title: "Chau Tran blog",
        description: "Personal blog of Chau Tran aka nartc",
        site: import.meta.env.SITE,
        items: globs.map((glob) => ({
            title: glob.frontmatter.title,
            link:
                glob.url ||
                import.meta.env.SITE + `/blog/${glob.frontmatter.slug}`,
            pubDate: glob.frontmatter.publishedAt,
            description: glob.frontmatter.description,
        })),
        stylesheet: "/rss/styles.xsl",
    });
