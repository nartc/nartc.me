---
title: Signal-friendly Angular APIs
description: In this blog post, we'll see how we can create APIs that are signal-friendly.
publishedAt: 2023-09-05
tags: ["Angular"]
slug: angular-signals-friendly
draft: true
---

So, we've had [Angular Signals](https://angular.io/guide/signals) in [Developer Preview](https://blog.angular.io/angular-v16-is-here-4d7a28ec680d)
for almost half a year now. The community has been searching for new patterns for reactivity in Angular applications.

-   [NgRx Signals](https://github.com/ngrx/platform/discussions/3796)
-   [Enea's computedFrom](https://itnext.io/a-sweet-spot-between-signals-and-observables-a3c9620768f1)

Folks have discussed consuming Signals, but not creating easy-to-use libraries. In my opinion, a well-designed library that is optimized for Signal's parameters could significantly increase Signal's usage. Today, we'll take a look at one example from [angular-three](https://github.com/angular-threejs/angular-three), `injectNgtLoader`, to understand all the moving parts of a reactive Signal library.

## Angular Signal

First, let's review Angular Signal APIs: `signal`, `computed`, and `effect`

```ts
export class Counter {
    //      👇 creating a Signal with default value
    count = signal(0);
    //      👇 creating a computed Signal, in other words, a derived state
    //                👇 the compute fn is invoked everytime `this.count` changes
    double = computed(() => this.count() * 2);

    constructor() {
        effect((onCleanup) => {
            //                  👇 register a dependency for effect() to track
            const count = this.count();
            const tick = 0;
            const id = setInterval(() => {
                console.log(`It has been ${tick} since last change: ${count}`);
                tick += 1;
            }, 1000);
            onCleanup(() => clearInterval(id));
        });
    }
}
```

The code snippet should be easy to understand. If you find it confusing, please refer to the [documentation](https://angular.io/guide/signals).

## Functions with Signals as parameters

To compose Signals, we will want to have functions that accept Signal as parameters. A _func_ (pun intended 😝) fact about Angular Signal is that they chose to use function calls to read Signal's value. With this in mind, we can create functions as follows:

```ts
function smartFunction(data: Signal<number>) {
    /* do stuff that takes advantage of Signal. start an effect, returns a computed etc... */
}

export class Counter {
    count = signal(0);

    constructor() {
        //              👇 we can pass in the Signal directly
        smartFunction(this.count);
        //              👇 we can pass in the readonly Signal
        smartFunction(this.count.asReadonly());
        //              👇 we can pass in the computed Signal
        smartFunction(computed(() => this.count() * 2));
        //              👇 we can pass a function that returns the Signal value
        smartFunction(() => this.count());
    }
}
```

## The almighty `inject()`

Normal functions are definitely helpful but in Angular, the _more_ helpful ones are the ones that tap into [Dependency Injection](https://angular.io/guide/dependency-injection-overview) using `inject()` internally. However, `inject()` has a caveat of it can **only be used** inside of an [Injection Context](https://angular.io/guide/dependency-injection-context).

```ts
export class Counter {
    //            👇 ok ✅
    destroyRef = inject(DestroyRef);

    constructor() {
        // 👇 ok ✅
        inject(DestroyRef);
    }

    ngOnInit() {
        // 👇 not ok ❌
        inject(DestroyRef);
    }
}
```

## Functions that use `inject()`

This is even less clear when `inject()` is used in other functions.

```ts
function injectOnDestroy(cb: () => void) {
    inject(DestroyRef).onDestroy(cb);
}

export class Counter {
    ngOnInit() {
        // 👇 consumers don't know why this would throw an error ❌
        injectOnDestroy(() => {});
    }
}
```

We cannot workaround the limitation of `inject()` but we can be more responsible with it. Here are several rules of thumbs that I follow for functions that utilize `inject()`:

-   Always has an optional parameter that is an `Injector` so the consumers can be flexible with the **Injection Context**.
-   Always use `assertInInjectionContext` to ensure the function is called in an **Injection Context**.
-   Use `runInInjectionContext` to ensure the function is called in an **Injection Context** and return the result of the function.

### A slightly improved `assertInInjectionContext`

`assertInInjectionContext` is a function that throws an error if it is not called in an **Injection Context**. It is a good practice to use it in functions that use `inject()`.

```ts
function injectOnDestroy(cb: () => void) {
    assertInInjectionContext(injectOnDestroy);
    inject(DestroyRef).onDestroy(cb);
}

export class Counter {
    ngOnInit() {
        // 👇 consumers should know that `injectOnDestroy` is being called outside of an Injection Context error
        injectOnDestroy(() => {});
    }
}
```

However, `assertInInjectionContext` is a little clunky to use when we have an optional parameter for `Injector`.

```ts
function injectOnDestroy(cb: () => void, injector?: Injector) {
    assertInInjectionContext(injectOnDestroy);

    // at this point, we know that we're inside of an injector context
    // but we don't know if the injector is the one that we want
    // and this "injector" is still Injector | undefined
    injector;

    inject(DestroyRef).onDestroy(cb);
}
```

It would be better, in my opinion, that after we assert the **Injection Context**, the `injector` parameter is guaranteed to be an `Injector` whether it is the **default** or the **custom** one.

```ts
function assertInjectionContext(fn: Function, injector?: Injector): Injector {
    !injector && assertInInjectionContext(fn);
    return injector ?? inject(Injector);
}

function injectOnDestroy(cb: () => void, injector?: Injector) {
    injector = assertInjectionContext(injectOnDestroy, injector);
    // ☝️ injector is guaranteed to be an Injector at this point
    /* .. */
    return runInInjectionContext(injector, () => {
        /* code in here always runs in an Injection Context regardless */
    });
}
```

### `runInInjectionContext`

Why use `runInInjectionContext` at all and not just use `injector.get()`? `injector.get()` is dubbed as an anti-pattern because it is similar to Service Locator. `runInInjectionContext` is a better alternative because it is explicit and it is clear that the function is being called in an **Injection Context**

It is also easier to refactor code to use `runInInjectionContext` because we can add the `injector` parameter to the function signature and move our existing code into the `runInInjectionContext` callback.

## `injectNgtLoader`

With all the knowledge we've learned so far, let's take a look at `injectNgtLoader` and see how it is designed to be Signal-friendly.

### What does it do?

In [THREE.js](https://threejs.org), we can load 3D models using different types of loaders. For example, we can load a `.gltf` file using `GLTFLoader` or a `.fbx` file using `FBXLoader`. `injectNgtLoader` is a wrapper around `THREE.Loader` that allows us to load 3D models, cache them, and return the loaded data as `Signal`

### How should it work?

`injectNgtLoader` needs 2 **required** parameters: a Loader or a way to get the Loader, and some path(s) (i.e: URLs or relative paths).

If we don't think about reactivity at all, we could write `injectNgtLoader` as follow

```ts
export function injectNgtLoader(loader: Loader, urls: string | string[]) {}

export class Model {
    model = injectNgtLoader(new THREE.GLTFLoader(), "path/to/model.gltf");
}
```

This can definitely work but it is not Signal-friendly. In fact, it is not even Angular-friendly. Suppose the `path/to/model.gltf` was an Input, we cannot pass that Input into `injectNgtLoader` as it is written at the moment

```ts
export class Model {
    @Input({ required: true }) path = "";

    //                                                  👇 this won't work because Angular resolves the Input's value later than this point.
    model = injectNgtLoader(new THREE.GLTFLoader(), this.path);
}
```

Another problem is that we might have different types of loaders based on the inputs: the file extension or if the paths are inside of an array can warrant different loaders. This means that `injectNgtLoader` needs to be made reactive to the parameters.

### Making `injectNgtLoader` reactive

To make `injectNgtLoader`, we need to allow it to accept `Signal`. Additionally, we want to make the first argument to be a `loaderConstructor` instead of a Loader instance.

```ts
export function injectNgtLoader(
    loaderConstrutor: (inputs: string | string[]) => Type<Loader>,
    urls: () => string | string[],
) {}
```
