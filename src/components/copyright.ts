import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
    selector: "app-copy-right",
    template: `
        <p class="text-gray-medium font-thin text-sm">
            © All rights reserved. AngularVietnam
        </p>
        <p class="text-gray-medium font-thin text-sm ml-1 mt-0 lg:mt-2 lg:ml-0">
            Built with
            <a
                href="https://astro.build"
                rel="noreferrer"
                target="_blank"
                class="cursor-pointer text-primary hover:underline"
            >
                Astro
            </a>
        </p>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    host: {
        class: "flex flex-row lg:flex-col",
    },
})
export class Copyright {}
