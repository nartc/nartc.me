import { DatePipe, NgIf } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import type { Frontmatter } from "../models/frontmatter";

@Component({
    selector: "app-blog-item",
    template: `
        <div class="flex justify-between items-center">
            <span class="font-light text-gray-medium">
                {{ blog.publishedAt | date }}
                <!-- <span *ngIf="route.readingTime">
                  - {{ route.readingTime | number: '1.0-0' }} {{ route.readingTime > 1 ? 'mins' : 'min' }}
                </span> -->
            </span>
            <a
                *ngIf="blog.tags.length"
                class="px-2 py-1 text-sm text-secondary font-bold rounded hover:text-white hover:bg-secondary transition-colors duration-200 ease-in-out cursor-pointer"
                [href]="'/tag/' + blog.tags[0].toLowerCase()"
            >
                {{ blog.tags[0] }}
            </a>
        </div>
        <div class="mt-2">
            <a
                class="text-2xl font-bold hover:text-gray-medium transition-colors duration-200 ease-in-out"
                [href]="'/blog/' + blog.slug"
            >
                {{ blog.title }}
            </a>
            <p class="mt-2 font-thin text-gray-dark">{{ blog.description }}</p>
        </div>
    `,
    host: {
        class: "block py-4",
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [DatePipe, NgIf],
})
export class BlogItem {
    @Input() blog!: Frontmatter;
}
