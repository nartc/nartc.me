---
title: The power of Angular Directive and Dependency Injection
description: If you know how they work and what is available to you, you can create some powerful UI pieces in Angular
slug: angular-directives-di
publishedAt: 2021-12-27
tags: ["Angular"]
---

In this blog post, I want to show a use case that demonstrates the power of Angular Directives coupled with Angular's Dependency Injection system.

## Use-case

I am working on a library called [Angular Three](https://angular-three.netlify.app/), which is a [THREE.js](https://threejs.org/) integration for [Angular](https://angular.io). Here is a simple 3D Scene and the code for that scene:

![A spinning cube with mouse interactions](https://i.imgur.com/tMYyDEY.gif)
_A spinning cube with mouse interactions_

```tsx
@Component({
    selector: "ngt-cube",
    template: `
        <ngt-soba-box
            #sobaBox
            [ngtBoxHelper]="['black']"
            (animateReady)="onAnimateReady(sobaBox.object)"
            (click)="active = !active"
            (pointerover)="hover = true"
            (pointerout)="hover = false"
            [isMaterialArray]="true"
            [scale]="active ? [1.5, 1.5, 1.5] : [1, 1, 1]"
        >
            <ngt-cube-materials [hover]="hover"></ngt-cube-materials>
        </ngt-soba-box>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CubeComponent {
    hover = false;
    active = false;

    onAnimateReady(mesh: THREE.Mesh) {
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z += 0.01;
    }
}
```

As seen in the GIF, you can see that I can interact with the cube in a couple of ways:

-   Hovering changes its colors.
-   Clicking changes its scale.

There is no feedback to tell the users that the cube is actionable (no `cursor: pointer`). A cube is a 3D object drawn inside an `HTMLCanvasElement`, so there is no DOM for this cube, so there is no `cursor: pointer`.

We are going to fix that in this blog post.

## Naive fix

The naive approach would be to change the `style.cursor` on the `document.body`, and we can do this because we can listen to `(pointerover)` and `(pointerout)` events on the cube. Let's change our code to implement this:

```tsx
@Component({
    selector: "ngt-cube",
    template: `
        <ngt-soba-box
            #sobaBox
            ...
            (pointerover)="onPointerOver()"
            (pointerout)="onPointerOut()"
            ...
        >
            <ngt-cube-materials [hover]="hover"></ngt-cube-materials>
        </ngt-soba-box>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CubeComponent {
    hover = false;
    active = false;

    onPointerOver() {
        this.hover = true;
    }

    onPointerOut() {
        this.hover = false;
    }

    onAnimateReady(mesh: THREE.Mesh) {
        /* ... */
    }
}
```

Everything should be the same as before. Let’s actually start with the fix

```tsx
@Component({
    selector: "ngt-cube",
    template: `
        <ngt-soba-box
            #sobaBox
            ...
            (pointerover)="onPointerOver()"
            (pointerout)="onPointerOut()"
            ...
        >
            <ngt-cube-materials [hover]="hover"></ngt-cube-materials>
        </ngt-soba-box>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CubeComponent {
    hover = false;
    active = false;

    // 👇 inject DOCUMENT (aka document)
    constructor(@Inject(DOCUMENT) private document: Document) {}

    onPointerOver() {
        this.hover = true;
        //👇 change to pointer on hover
        this.document.body.style.cursor = "pointer";
    }

    onPointerOut() {
        this.hover = false;
        //👇 change to pointer off hover
        this.document.body.style.cursor = "auto";
    }

    onAnimateReady(mesh: THREE.Mesh) {
        /* ... */
    }
}
```

![Cursor changes to “pointer” on hover](https://i.imgur.com/acO7InG.gif)
_Cursor changes to “pointer” on hover_

Hurray 🎉! We now have feedback for users that our cube is actionable.

![https://media4.giphy.com/media/QYLQRR7IF48njkq5an/giphy.gif?cid=ecf05e47e3w414zm0jv0dqzfv482le8uzduejd3e0idk0syw&rid=giphy.gif&ct=g](https://media4.giphy.com/media/QYLQRR7IF48njkq5an/giphy.gif?cid=ecf05e47e3w414zm0jv0dqzfv482le8uzduejd3e0idk0syw&rid=giphy.gif&ct=g)

What if we add the `cursor: pointer` fix to different 3D objects that might not be in the same Component? That would be quite a chore to do.

-   We would need to listen to two events `(pointerover)` and `(pointerout)` even if the object might not need to have “hover” interactions.
-   We would need to inject `DOCUMENT` to change the `body.style`.

Let's re-assert what we need and think of a different approach 🤔

-   We need to listen to `(pointerover)` and `(pointerout)` events on 3D Objects
    > This is only applicable to Angular Three, but the thought process for different projects/use-cases is the same.
-   We need to change the style of a global object (`document.body`)
-   We need to do this for any 3D objects
-   We want to be able to declaratively add/remove this functionality (`cursor:pointer`)

With all of these points listed out, an Angular Directive, specifically an Attribute Directive, sounds like what we need to create.

> Check [Attribute Directive](https://angular.io/guide/attribute-directives) to learn more about it.

## Into the Directive lane

In Angular, you can attach Attribute Directives on any elements on the DOM, and if the Directive's selector matches, Angular will instantiate the Directive with the appropriate **context**.

### What is this “context” thing?

A context is an environment that the Directive is created with. In other words, what is available for this Directive to access via Angular’s Dependency Injection based on where it is attached.

```tsx
@Directive({
    selector: "[some]",
})
export class SomeDirective {
    // 👇 what is available here? This is important
    constructor() {}
}
```

Here’s how `SomeDirective` might be used/attached:

**HTML Elements**

```html
<div some></div>
<button some></button>
```

When a Directive is attached on an `HTMLElement`, the Directive will have access to:

-   `ElementRef<TElement>`: where `TElement` is the actual type of the element. Eg: `<button>` is `HTMLButtonElement`, `<div>` is `HTMLDivElement`. `ElementRef` is the reference to the DOM element that is rendered, like what you would see in the Element Dev Tool.

```tsx
@Directive({
    /*...*/
})
export class SomeDirective {
    constructor(elRef: ElementRef<HTMLButtonElement>) {}
}
```

**Component**

```html
<some-component some></some-component>
```

When a Directive is attached on a Component, the Directive will have access to:

-   `ElementRef<HTMLElement>`: same as above
-   `TComponent`: where `TComponent` is the type of the Component. The Directive has access to the instance of the Component that Angular creates.

```tsx
@Directive({
    /*...*/
})
export class SomeDirective {
    constructor(
        // 👇 the <some-component> element
        elRef: ElementRef<HTMLElement>,
        // 👇 the SomeComponent instance
        some: SomeComponent,
    ) {}
}
```

**ng-template**

```html
<ng-template some></ng-template>
```

When a Directive is attached on `ng-template`, the Directive will have access to:

-   `ElementRef<Comment>`: When you render `ng-template`, Angular will put a comment: `<!-- container -->` in its place. This comment will be available for the Directive via `ElementRef<Comment>`
-   `TemplateRef<any>`: The `TemplateRef` instance.

```tsx
@Directive({/*...*/})
export class SomeDirective {
	constructor(
    // 👇 the <!-- container --> comment
		elRef: ElementRef<Comment>,
    // 👇 the TemplateRef instance
    // 👇.                   👇 you can use any specific generic here if you know what the Context is
		templateRef: TemplateRef<any>
	) {
		console.log(elRef.nativeElement.textContent): // logs: 'container'
	}
}
```

> `ViewContainerRef` is always available to Attribute Directive

**Inheritance**

In addition to the above, the Directive also has access to the Hierarchical Injector Tree, where it's attached. Let's look at the following examples:

-   Other directives

```html
<input [ngModel]="name" some />
```

`SomeDirective` has access to the `NgModel` instance and anything that `NgModel` might have inherited (the underlying `NgControl`), so you can have a Directive that might do some additional Form logic.

-   Component’s Providers

```html
<some-component some></some-component>
```

`SomeDirective` has access to anything that is provided in `SomeComponent`'s providers

```tsx
@Component({
	/*...*/,
             // 👇 this will also be made available to SomeDirective
	providers: [SomeService]
})
export class SomeComponent {}
```

`SomeDirective` also has access to `SomeComponent`'s ancestors’ Injector

```html
<some-parent>
    <some-component some></some-component>
</some-parent>
```

In this case, anything that is available in `SomeParent` will also be made available to `SomeDirective` via Dependency Injection.

-   Root/Platform Providers: `ChangeDetectorRef`, `NgZone`, `ApplicationRef`, `@Inject(DOCUMENT)`, etc.

> Everything listed here might not be exhaustive, as these are the things that I am aware of. You can quickly check what is available in any specific building block of Angular by injecting the `Injector` and checking it in the console.

![Checking `Injector` in the console](https://i.imgur.com/9wPy3zX.png)
_Checking `Injector` in the console_

### The overlooked feature: Directive’s Selector

One powerful feature of Angular Directives is specifying the `selector` like CSS Selectors. Let’s bring back our `SomeDirective`

```tsx
@Directive({
    selector: "[some]",
})
export class SomeDirective {}
```

Let's also assume that `SomeDirective` will **ALWAYS** need to be there whenever `SomeComponent` is used. In other words, `SomeDirective` handles some certain logic for `SomeComponent` that is extracted out of the Component to achieve Separation of Concern. Having to do the following is tedious

```html
<some-component some></some-component>
<some-component some></some-component>
<some-component some></some-component>
<some-component some></some-component>
<some-component some></some-component>
```

Instead, we can change `SomeDirective`'s `selector` to `some-component` so that it will get instantiated in the same manner as `SomeComponent`

```tsx
@Directive({
    // 👇 nothing really prevents you from doing this
    selector: "some-component",
})
export class SomeDirective {}
```

This is extremely powerful if you know how to take advantage of it, especially you're building reusable components and want to get rid of some _nuances_ for your consumers. You can control how your Directives are instantiated:

-   Relaxing: make the selectors more relaxed. Like what we did with `SomeDirective` and `SomeComponent`
-   Constraining: make the selectors more constrained. For example, `[some]` might be too broad and might be misused; we can constrain it to just `some-component` by changing the selector to `some-component[some]`
-   Condition: Directives’ selectors are like CSS Selectors, you can apply some conditions to them. For example, `[some][foo]:not([bar]),[some][bar]:not([foo]),[some]:not([foo]):not(bar)` . This says: `SomeDirective` can be instantiated by itself, with `[foo]` input, or with `[bar]` input but never `[foo]` and `[bar]` inputs at the same time.

Now that we have all that information, we can continue on our proper fix to the problem stated at the beginning of this blog post.

## Proper fix to the cursor problem

Start by creating a Directive (you can use the Angular CLI if you want to)

```tsx
@Directive({
    selector: "[cursorPointer]",
})
export class CursorPointerDirective {
    constructor() {}
}
```

This is how we would want to use `CursorPointerDirective`

```html
<ngt-mesh cursorPointer></ngt-mesh>
```

The job of `CursorPointerDirective` is to listen to the pointers’ events and update `document.body` style. Let’s fill the directive up

```tsx
@Directive({
    selector: "[cursorPointer]",
})
export class CursorPointerDirective implements OnDestroy {
    // 👇 a Subject to use with takeUntil
    destroyed$ = new Subject();

    constructor(
        // 👇 we need the Document so we can change its body's style
        @Inject(DOCUMENT) document: Document,
        // 👇 we use Optional so we can be less disruptive. The consumers might attach [cursorPointer] on elements that are not supposed to be attached to
        // 👇       // 👇 This is arbitrary but in Angular Three, this is where the pointer's events are declared (aka Outputs)
        @Optional() object3dInputsController: NgtObject3dInputsController,
    ) {}

    // 👇 a Directive shares the same life-cycle with the Element/Component that it's attached to
    // in this case, when the 3D Object is destroyed, `cursorPointer` is also destroyed
    ngOnDestroy() {
        this.destroyed$.next();
    }
}
```

That is all the prep work we need for `CursorPointerDirective`. Now, the **listening** part:

```tsx
@Directive({
    selector: "[cursorPointer]",
})
export class CursorPointerDirective implements OnDestroy {
    destroyed$ = new Subject();

    constructor(
        @Inject(DOCUMENT) document: Document,
        @Optional() object3dInputsController: NgtObject3dInputsController,
    ) {
        // if object3dInputsController is not available, just fail fast
        if (!object3dInputsController) return;

        // 👇 EventEmitter (Outputs) is just RxJS Subjects so we can subscribe to them
        // 👇 import { merge } from rxjs;
        merge(
            // 👇 if pointerover, map to true as in hovered: true
            object3dInputsController.pointerover.pipe(mapTo(true)),
            // 👇 if pointerout, map to false as in hovered: false
            object3dInputsController.pointerout.pipe(mapTo(false)),
        )
            .pipe(
                // 👇 clean up
                takeUntil(this.destroyed$),
            )
            .subscribe((hovered) => {
                // 👇 the main logic
                document.body.style.cursor = hovered ? "pointer" : "auto";
            });
    }

    ngOnDestroy() {
        this.destroyed$.next();
    }
}
```

That's it! Now we can use `cursorPointer` on `ngt-mesh` and see the result:

```tsx
@Component({
    selector: "ngt-cube",
    template: `
        <ngt-soba-box
            #sobaBox
            <!-- 👇this is it. ngtCursor is Angular Three equivalent to cursorPointer -->
            ngtCursor
            [ngtBoxHelper]="['black']"
            (animateReady)="onAnimateReady(sobaBox.object)" 
            (click)="active = !active" 
            (pointerover)="hover = true" 
            (pointerout)="hover = false"
            [isMaterialArray]="true"
            [scale]="active ? [1.5, 1.5, 1.5] : [1, 1,1]" 
        >
            <ngt-cube-materials [hover]="hover"></ngt-cube-materials>
        </ngt-soba-box>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CubeComponent {
    hover = false;
    active = false;

    // component code is clean 😎

    onAnimateReady(mesh: THREE.Mesh) {
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z += 0.01;
    }
}
```

## Conclusion

With some knowledge about Directives, we made a reusable `cursorPointer` directive that other 3D objects can use on any 3D Objects for showing `cursor: pointer`. I hope you learn something from this blog post. Have fun and good luck 👋.
