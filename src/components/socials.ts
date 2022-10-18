import { NgForOf } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";
import { SocialIcon } from "./social-icon";

@Component({
    selector: "app-socials",
    template: `
        <app-social-icon
            *ngFor="let social of socials"
            [socialId]="social.id"
            [link]="social.link"
        ></app-social-icon>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    host: {
        class: "block w-full lg:w-1/2 grid grid-cols-6 lg:grid-cols-3 gap-2 mb-4",
    },
    imports: [SocialIcon, NgForOf],
})
export class Socials {
    readonly socials = [
        { id: "Github", link: "https://github.com/nartc" },
        { id: "LinkedIn", link: "https://www.linkedin.com/in/chauntran/" },
        { id: "Twitter", link: "https://twitter.com/Nartc1410" },
        { id: "Facebook", link: "https://www.facebook.com/ctran2428" },
        {
            id: "Stackoverflow",
            link: "https://stackoverflow.com/users/8468804/chau-tran",
        },
        { id: "Youtube", link: "https://youtube.com/c/ChauTran" },
    ] as const;
}
