---
title: Abstract inject() function the right way
description: In this short post, we'll look at how we can create better custom inject functions
publishedAt: 2023-09-06
tags: ["Angular"]
slug: inject-function-the-right-way
---

Since Angular 14, we have had the almighty `inject()` function as a way to inject dependencies into our Angular entities.

> We won't be discussing the differences between `inject()` and traditional Constructor DI in this blog post.

## Custom Inject Functions

Some folks are going to hate me for this 😅, but it's ok. I personally like `inject()` because it allows for better compositions with Custom Inject Functions (if you are familiar with [React](https://react.dev), then this is somewhat similar to [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)). However, there is one caveat to `inject()` that it has to be invoked in an [Injection Context](https://angular.io/guide/dependency-injection-context).

> The snippets in this blog post will be using some of [Angular Three](https://github.com/angular-threejs/angular-three) so it makes sense for some of the points I am going to make.

It is easy to spot misuses of `inject()` when we use it directly like follow:

```ts
import { DestroyRef } from "@angular/core";
import { NgtStore } from "angular-three";

export class Model {
	//              👇 correct usage ✅
	private store = inject(NgtStore);
	private destroyRef = inject(DestroyRef);
	private beforeRenderCleanup = this.store.get("internal").subscribe(() => {
		/* code to be ran in an animation loop */
	});
	private _nonUse_ = this.destroyRef.onDestroy(() => {
		this.beforeRenderCleanup();
	});

	constructor() {
		// If we do not need any of the above anywhere else, then constructor is a great spot
		//                          👇 correct usage ✅
		const beforeRenderCleanup = inject(NgtStore)
			.get("internal")
			.subscribe(() => {
				/* code to be ran in an animation loop */
			});
		inject(DestroyRef).onDestroy(() => {
			beforeRenderCleanup();
		});
	}

	ngOnInit() {
		//                          👇 going to throw error ❌
		//                          👇 because ngOnInit isn't an Injection Context
		const beforeRenderCleanup = inject(NgtStore)
			.get("internal")
			.subscribe(() => {
				/* code to be ran in an animation loop */
			});
		inject(DestroyRef).onDestroy(() => {
			beforeRenderCleanup();
		});
	}
}
```

On the other hand, errors relating to **Injection Context** are harder to spot (and debug) when we have **Custom Inject Functions (CIFs)**. Let's assume that we want to provide an easier way for consumers to run some code in the animation loop, we will probably need to create a CIF

```ts
/* extra typings in this snippet are irrelevant */
import { NgtStore } from "angular-three";

export function injectBeforeRender(
	cb: NgtBeforeRenderRecord["callback"],
	priority = 0,
) {
	const store = inject(NgtStore);
	const cleanup = store.get("internal").subscribe(cb, priority, store);
	inject(DestroyRef).onDestroy(() => void cleanup());
	return cleanup;
}
```

Then, our component can be updated as follow 🎊!

```ts
export class Model {
	constructor() {
		injectBeforeRender(() => {
			/* code to be ran in an animation loop */
		});
	}
}
```

## The Limitations

This looks clean! But, `injectBeforeRender` comes with some limitations. Let's take a look at the following scenario

```diff
export class Model {
+   // Model now accepts an Input for renderPriority to customize the order of the code that runs in the animation loop
+   @Input() renderPriority = 0;
}
```

### Limitation 1: Input values aren't resolved in **Injection Context**, yet

We now have to pass `renderPriority` in `injectBeforeRender` as the second argument. Of course, we can invoke `injectBeforeRender` in `constructor` but by the time the `constructor` is invoked, Angular hasn't resolved the Input value yet.

```ts
export class Model {
	@Input() renderPriority = 0;

	constructor() {
		// This won't work because `renderPriority` is always 0
		injectBeforeRender(() => {
			/* code to be ran in an animation loop */
		}, this.renderPriority);
	}
}
```

### Limitation 2: Outside of **Injection Context**

We know that `ngOnInit` is one of the places where Angular has resolved the Input value but `ngOnInit` is invoked **outside** of an **Injection Context**.

```ts
export class Model {
	@Input() renderPriority = 0;

	ngOnInit() {
		// This won't work because `injectBeforeRender` is invoked outside of an Injection Context
		injectBeforeRender(() => {
			/* code to be ran in an animation loop */
		}, this.renderPriority);
	}
}
```

One extra caveat for the 2nd limitation is when `injectBeforeRender` throws, we will see a generic message relating to `inject()` being invoked outside of an **Injection Context**. Nothing points to `injectBeforeRender` being the one function that throws.

We cannot fix the limitations but we can at least workaround them by making our CIF more robust and more responsible. Yes, for the _extra caveat_ as well.

## The **better** way of making a CIF

First, let's work on the _extra caveat_. This one is easy because we can use a utility provided by Angular [`assertInInjectionContext()`](https://angular.io/api/core/assertInInjectionContext)

```diff
/* extra typings in this snippet are irrelevant */
import { NgtStore } from "angular-three";
+ import { assertInInjectionContext } from "@angular/core";

export function injectBeforeRender(
    cb: NgtBeforeRenderRecord["callback"],
    priority = 0,
) {
+   assertInInjectionContext(injectBeforeRender);
    const store = inject(NgtStore);
    const cleanup = store.get("internal").subscribe(cb, priority, store);
    inject(DestroyRef).onDestroy(() => void cleanup());
    return cleanup;
}
```

And with that, the _extra caveat_ is taken care of. When `injectBeforeRender` throws (in dev mode), we will see an error stating that `injectBeforeRender` being invoked outside of an **Injection Context**.

To work around the limitations, we need to allow our CIF to accept an _optional parameter_ of type `Injector`. An `Injector` represents the **Injection Context** that provides that `Injector`. With the `Injector` argument, the consumers can **control** the **Injection Context** that a CIF is invoked. We want it to be _optional_ because most of the times, it should not be needed.

```diff
/* extra typings in this snippet are irrelevant */
import { NgtStore } from "angular-three";
import { assertInInjectionContext } from "@angular/core";

export function injectBeforeRender(
    cb: NgtBeforeRenderRecord["callback"],
-   priority = 0,
+   { priority = 0, injector }: { priority?: number; injector?: Injector } = {},
) {
    assertInInjectionContext(injectBeforeRender);
    const store = inject(NgtStore);
    const cleanup = store.get("internal").subscribe(cb, priority, store);
    inject(DestroyRef).onDestroy(() => void cleanup());
    return cleanup;
}
```

Half way there! Our `CIF` now has `injector` argument but it has to decide whether to use that **custom** injector or use the **default** injector (i.e: the current **Injection Context** that the CIF is invoked in). To achieve this, we will create a function that will guarantee anything below it is running in an **Injection Context**

```ts
export function assertInjector(fn: Function, injector?: Injector): Injector {
	// we only call assertInInjectionContext if there is no custom injector
	!injector && assertInInjectionContext(fn);
	// we return the custom injector OR try get the default Injector
	return injector ?? inject(Injector);
}
```

With this, we can update our CIF as follow

```diff
/* extra typings in this snippet are irrelevant */
import { NgtStore } from "angular-three";
+ import { assertInjector } from './assert-injector';

export function injectBeforeRender(
    cb: NgtBeforeRenderRecord["callback"],
    { priority = 0, injector }: { priority?: number; injector?: Injector } = {},
) {
-   assertInInjectionContext(injectBeforeRender);
+   injector = assertInjector(injectBeforeRender, injector);
+   // 👆 injector is guaranteed to be an Injector instance whether it is custom or default
+   return runInInjectionContext(injector, () => {
        const store = inject(NgtStore);
        const cleanup = store.get("internal").subscribe(cb, priority, store);
        inject(DestroyRef).onDestroy(() => void cleanup());
        return cleanup;
+   })
}
```

### Why do we use `runInInjectionContext`?

As its name suggests, `runInInjectionContext` runs arbitrary code in a provided **Injector Context** (i.e: an `Injector`). Instead of `runInInjectionContext`, we can also use `injector.get()` to retrieve the dependencies that our CIF needs but `injector.get()` seems like [Service Locator](https://en.wikipedia.org/wiki/Service_locator_pattern) which is seen as an anti-pattern by many.

Additionally, refactoring code to use `runInInjectionContext` is easy because we can move our existing code inside of `runInInjectionContext` and everything goes back to working.

## How do we consume our CIF now?

With the above changes, consumers can safely consume our CIF `injectBeforeRender` in many different ways

```ts
export class Model {
	@Input() renderPriority = 0;

	constructor() {
		// ✅ no renderPriority, everything works as before
		injectBeforeRender(() => {
			/* code to be ran in an animation loop */
		});
	}

	private injector = inject(Injector);

	ngOnInit() {
		// ✅ works with custom Injector, Input works as well
		injectBeforeRender(
			() => {
				/* code to be ran in an animation loop */
			},
			{
				priority: this.renderPriority,
				injector: this.injector,
			},
		);

		// ✅ throws a clear error that "injectBeforeRender" is invoked outside of an Injection Context
		injectBeforeRender(
			() => {
				/* code to be ran in an animation loop */
			},
			{ priority: this.renderPriority },
		);
	}
}
```

## Conclusion

With the help of `assertInInjectionContext` and `runInInjectionContext`, we've made our **Custom Inject Function (CIF)** more robust by allowing the consumers to control the **Injection Context** that the CIF is invoked in and more responsible by telling the consumers that our CIF is the one throwing error if it is invoked outside of an **Injection Context**.

I personally use this approach for all CIFs that `angular-three` has. We did not discuss **Testing CIFs** in this blog post but I'll definitely write up a new one when I discover things to share in that regard. For now, have fun!

## Thank you

Thanks [Enea](https://twitter.com/Enea_Jahollari) for reviewing!
