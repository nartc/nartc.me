import type { Frontmatter } from "../models/frontmatter";

export function byDate(a: Frontmatter, b: Frontmatter) {
    const d1 = new Date(a.publishedAt);
    const d2 = new Date(b.publishedAt);
    return d2.getTime() - d1.getTime();
}
