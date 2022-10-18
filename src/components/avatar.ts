import { NgOptimizedImage } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import avatar from "../assets/speak.png";

@Component({
    selector: "app-avatar",
    template: `
        <div
            class="group w-full h-full rounded-full border-4 border-transparent text-center flex items-center relative avatar"
            data-tooltip="New version available 🚀"
        >
            <picture class="avatar">
                <img
                    [ngSrc]="avatar"
                    alt="avatar of chau"
                    width="64"
                    height="64"
                />
            </picture>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    host: {
        class: "w-16 h-16 relative mb-4 block",
        role: "img",
        "aria-label": " Avatar of Chau",
    },
    imports: [NgOptimizedImage],
})
export class Avatar {
    readonly avatar = avatar.src;
}
