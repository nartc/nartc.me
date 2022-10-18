import { NgForOf } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import type { Frontmatter } from "../models/frontmatter";
import { BlogItem } from "./blog-item";

@Component({
    selector: "app-blog-list",
    template: `
        <section *ngFor="let blog of blogs">
            <app-blog-item [blog]="blog"></app-blog-item>
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [NgForOf, BlogItem],
    host: {
        class: "flex flex-col divide-y divide-gray-400",
    },
})
export class BlogList {
    @Input() blogs: Frontmatter[] = [];
}
