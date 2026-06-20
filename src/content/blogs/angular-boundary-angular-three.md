---
title: Angular @boundary and Angular Three
description: Theory-crafting Angular's proposed @boundary block with Resource API and Angular Three scenes.
publishedAt: 2026-06-20
tags: ["Angular", "Angular Three"]
slug: angular-boundary-angular-three
---

Angular announced a proposed [`@boundary`](https://blog.angular.dev/announcing-angular-v22-c52bb83a4664) template block
recently. At least at the time I am writing this, I would not treat it as a production API. The public shape is still early,
and the details can change. This is not a tutorial.

This is more of a **thought exercise** from the perspective of [Angular Three](https://github.com/angular-threejs/angular-three).

I maintain Angular Three, a THREE.js integration for Angular with declarative scene graph, componentized meshes, loader
helpers, render loop hooks, and a helper package in `angular-three-soba`.

## Resource is explicit

The nice thing about Angular's [Resource API](https://angular.dev/guide/signals/resource) is that it makes async state boring
and visible. A consumer can look at a resource and decide what to do for each branch.

```angular-html
@if (model.hasValue()) {
    <app-car [model]="model.value()" />
} @else if (model.isLoading()) {
    <app-car-placeholder />
} @else if (model.error(); as error) {
    <app-car-error [error]="error" />
}
```

This is not as _cute_ as Suspense, but it is very Angular. There is no hidden thrown promise, no implicit pause in the middle
of rendering, and the template says exactly what happens when the resource is resolved, loading, or errored.

That explicitness also means each consumer gets to make its own choice. In one component tree, loading a car might render a
wireframe proxy and an error marker. In another component tree, loading might render nothing and error might fall back to a
static mesh. The Resource API does not prescribe the UI. It exposes the state and lets the consumer decide.

## The awkward Angular Three version

Now put that in Angular Three. A car model usually starts with a path:

```angular-html
<app-car path="/models/car.glb" />
```

The obvious implementation is for `app-car` to own the [GLTF](https://www.khronos.org/gltf/) resource.

```angular-ts
import { Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
import { NgtArgs } from 'angular-three';
import { gltfResource } from 'angular-three-soba/loaders';

@Component({
    selector: 'app-car',
    imports: [NgtArgs],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    template: `
        @if (model.hasValue()) {
            <ngt-primitive *args="[model.value().scene]" />
        } @else if (model.isLoading()) {
            <app-car-placeholder />
        } @else if (model.error(); as error) {
            <app-car-error [error]="error" />
        }
    `,
})
export class Car {
    path = input.required<string>();

    protected model = gltfResource(() => this.path());
}
```

This is fine at first glance. The component owns the path, the loading, the GLTF, and the rendering. Nice and encapsulated.

The problem is that `app-car` also owns the error UI now. Every consumer gets `<app-car-error />`. Maybe that is fine for a
demo, but it is not always what I want in a real scene. In a product configurator, the error might be a branded fallback. In
an editor, it might be a red debug object with the failed URL. In a background scene, I might want to render nothing.

Resource is explicit, but I accidentally hid the resource inside `app-car`, so the consumer lost the ability to choose the
branches.

## Push the resource up?

The pure Resource answer is to push the resource to the consumer and make `app-car` accept the loaded GLTF.

```angular-html
@if (car.hasValue()) {
    <app-car [model]="car.value()" />
} @else if (car.isLoading()) {
    <app-car-placeholder />
} @else if (car.error(); as error) {
    <app-car-error-in-showroom [error]="error" />
}
```

Then `app-car` becomes simpler:

```angular-ts
export class Car {
    model = input.required<LoadedCarModel>();
}
```

I like the control this gives the consumer. I do not always like the shape it forces onto the component API. Now the consumer
needs to know how to load the car. It needs the right loader helper, the right model type, maybe decoder setup, maybe preload
behavior, maybe extra processing. The input type can also get awkward because a loaded GLTF is not the same thing as the thing
the component conceptually wants to expose.

For a leaf component, this is okay. For a richer Angular Three component, it gets noisy. Imagine a car component that loads a
body model, wheel variants, optional paint textures, maybe an interior model. Passing all of that in as fully loaded inputs
keeps Resource control at the top, but it leaks a lot of implementation detail into the consumer.

There are other Angular answers like [content projection](https://angular.dev/guide/components/content-projection),
[`TemplateRef`](https://angular.dev/api/core/TemplateRef), or inputs for custom error templates. For the sake of
theory-crafting, let's pretend those are not the first things people reach for. They can become a lot of ceremony for
something that conceptually feels simple: this car failed here, render this fallback here.

## Where `@boundary` changes the tradeoff

This is where `@boundary` becomes interesting to me. With a boundary, `app-car` can own the Resource again. It can own the
path, the loader, the model processing, and the success rendering. But when the Resource errors, `app-car` can choose to let
that error escape instead of rendering its own error UI.

```angular-html
@boundary {
    <app-car path="/models/car.glb" />
} @error (let error) {
    <app-car-error-in-showroom [error]="error" />
}
```

Another consumer can do something else:

```angular-html
@boundary {
    <app-car path="/models/car.glb" />
} @error {
    <app-basic-car-proxy />
}
```

That is the premise I like: the component owns the Resource, but the consumer owns the error branch. `@boundary` does not
know anything about the Resource. It only catches because `app-car` decides that a Resource error means "I cannot render this
subtree".

Conceptually, `app-car` becomes something like this:

```angular-html
@if (model.hasValue()) {
    <ngt-primitive *args="[model.value().scene]" />
} @else if (model.isLoading()) {
    <app-car-placeholder />
} @else if (model.error(); as error) {
    {{ throwError(error) }}
}
```

Ignore the `throwError()` syntax here. I completely pulled that out of my rear. The point is the responsibility split:
Resource stays explicit inside the component, and the component explicitly turns the error branch into a render failure that a
consumer boundary can handle.

That feels different from Suspense. Suspense says pending async work changes rendering. This says a component can decide that
one explicit Resource branch is no longer locally recoverable.

## Why this matters more in 3D

In a 3D scene, the difference between local error UI and consumer-owned error UI can change the meaning of the scene.

```angular-html
<app-lights />
<app-camera-rig />

@boundary {
    <app-car path="/models/car.glb" />
} @error {
    <app-missing-car-marker />
}

@boundary {
    <app-hdr-environment preset="studio" />
} @error {
    <app-default-studio-light />
}

<app-orbit-controls />
```

A failed car model should not necessarily take down the camera controls. A failed HDR environment should not necessarily
blank the whole canvas. A failed material should maybe fall back to a debug material while the mesh stays alive.

The fallback is not always a panel or a toast. Often, the fallback is another 3D object.

That is probably the part that makes `@boundary` feel exciting for Angular Three. It lets the consumer define a **failure
domain** in the same place they define the scene structure.

And because boundaries can be nested, a fallback can have its own fallback:

```angular-html
@boundary {
    <app-car path="/models/car.glb" />
} @error (let error) {
    @boundary {
        <app-rich-car-error [error]="error" />
    } @error {
        <app-basic-car-proxy />
    }
}
```

That matters in a scene graph. The error UI can be just as risky as the thing it replaces.

## What about loading?

Error is the easier part. Loading is where the theory-crafting starts.

If `@boundary` is an error boundary, then loading should not magically move into it. A pending Resource is not an error; it is
state, and Angular picked Resource specifically so that async state remains explicit. I do not want `@boundary` to smuggle
Suspense back in.

So the conservative version is:

```angular-html
@boundary {
    <app-car path="/models/car.glb" />
} @error (let error) {
    <app-car-error-in-showroom [error]="error" />
}
```

`app-car` still owns its loading UI:

```angular-html
@if (model.isLoading()) {
    <app-car-placeholder />
}
```

This preserves Angular's explicitness, but the consumer cannot customize the loading branch unless the component exposes some
API for it, and maybe that is okay as loading feels like normal composition territory.

For example, `app-car` could expose a loading template:

```angular-html
<app-car path="/models/car.glb">
    <ng-template loading>
        <app-wireframe-car />
    </ng-template>
</app-car>
```

Or with a structural directive shorthand:

```angular-html
<app-car path="/models/car.glb">
    <app-wireframe-car *loading />
</app-car>
```

Same for a component-owned Resource error, if the component wants to keep errors local:

```angular-html
<app-car path="/models/car.glb">
    <app-car-loading *loading />
    <app-car-error *error="let error" [error]="error" />
</app-car>
```

That is just Angular composition. `ng-template`, content projection, structural directives, whatever API the component wants
to expose. It is not as globally elegant as Suspense, but it keeps the contract explicit and component-owned.

The error case is still more interesting to me because `@boundary` is not only about Resource errors. It can also catch the
unexpected stuff: a bad input assumption, a failed THREE object setup, a material component that throws, a bug in the subtree.
That is different from a loading template.

Could Angular expose a better control-flow primitive for Resource? Maybe. Something like this would be nice to write:

```angular-html
@resource (model; let value) {
    <app-car [model]="value" />
} @loading {
    <app-car-loading />
} @error (let error) {
    <app-car-error [error]="error" />
}
```

But this gets suspense-y, even if the Resource is named and the branches are visible. Maybe that is fine. Maybe it is too much
framework for something `@if` already handles. I am not sure.

## `@defer` is not this either

Angular already has `@defer`, and `@defer` has `@loading` and `@error` blocks. That is useful, but it is a different kind of
boundary.

```angular-html
@defer (on viewport) {
    <app-product-scene />
} @placeholder {
    <img src="/product-preview.webp" alt="Product preview" />
} @loading {
    <p>Loading 3D viewer...</p>
} @error {
    <p>Could not load the 3D viewer code.</p>
}
```

This is about loading the viewer code, not whether `/models/car.glb` loads, a texture fails, or `app-car` decides its Resource
error should escape to a consumer-owned fallback.

You might compose them:

```angular-html
@defer (on viewport) {
    @boundary {
        <app-product-scene />
    } @error (let error) {
        <app-scene-error [error]="error" />
    }
} @placeholder {
    <img src="/product-preview.webp" alt="Product preview" />
} @error {
    <p>Could not load the 3D viewer code.</p>
}
```

That composition is probably powerful, but the distinction matters: `@defer @error` means deferred code failed,
`@boundary @error` means the rendered subtree failed, and Resource `error()` means async data failed while the component still
gets to decide what to do with that state.

## Conclusion

For Angular Three, I think the useful mental model is this:

```txt
Resource owns async state.
Component owns whether that state is locally recoverable.
Boundary lets the consumer own unrecoverable UI for this usage.
```

That gives me a version of `app-car` that can stay encapsulated while still letting each scene choose its own failure UI:

```angular-html
@boundary {
    <app-car path="/models/car.glb" />
} @error {
    <app-car-fallback-for-this-scene />
}
```

Maybe Angular eventually gets a better Resource control-flow primitive. Maybe Angular Three grows a small helper for
resource-owning scene components. Maybe the answer is still component APIs with `TemplateRef`. I am not sure yet.

What I am sure about is that error ownership matters a lot in 3D. A failed model, texture, environment, or postprocessing
pass should not always decide its own fallback, and it should not take down the whole canvas. Put the boundary where the
consumer can tolerate failure. In a 3D scene, that is rarely the whole canvas.

Thanks for reading, and have fun!
