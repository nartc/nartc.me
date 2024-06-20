---
title: Angular Object Inputs
description: How to correctly provide object as inputs
slug: angular-object-inputs
publishedAt: 2024-06-20
tags: ["Angular"]
---

In this blog post, we will discuss how to correctly provide object as inputs in Angular components. As an example,
we'll take a look at [angular-three-cannon](https://github.com/angular-threejs/angular-three) `NgtcPhysics` component.

> `NgtcPhysics` is a component that provides the Physics World for [THREE.js](https://threejs.org) 3D object using [Cannon.js](https://schteppe.github.io/cannon.js/).

Here's a list of _most_ of the inputs that `NgtcPhysics` component accepts with their default values:

```typescript
const defaultOptions: NgtcPhysicsInputs = {
	allowSleep: false,
	axisIndex: 0,
	broadphase: 'Naive',
	defaultContactMaterial: { contactEquationStiffness: 1e6 },
	frictionGravity: null,
	gravity: [0, -9.81, 0],
	isPaused: false,
	iterations: 5,
	maxSubSteps: 10,
	quatNormalizeFast: false,
	quatNormalizeSkip: 0,
	shouldInvalidate: true,
	size: 1000,
	solver: 'GS',
	stepSize: 1 / 60,
	tolerance: 0.001,
};
```

### Individual Input approach

Normally, we would author `NgtcPhysics` with each individual Input for each option

```angular-ts {'Signal Input for maximum productivity': 1-2}
...
import { input } from '@angular/core';

@Component({})
export class NgtcPhysics {
    allowSleep = input(false);
    axisIndex = input(0);

    broadphase = input('Naive');
    defaultContactMaterial = input({ contactEquationStiffness: 1e6 });
    frictionGravity = input(null);
    gravity = input([0, -9.81, 0]);
    isPaused = input(false);
    iterations = input(5);
    maxSubSteps = input(10);
    quatNormalizeFast = input(false);
    quatNormalizeSkip = input(0);
    shouldInvalidate = input(true);
    size = input(1000);
    solver = input('GS');
    stepSize = input(1 / 60);
    tolerance = input(0.001);
}
```

The advantage of this approach is it allows the consumers of `NgtcPhysics` to _only_ provide the options they want to override. For example, if the consumers only want to override the gravity, they can do so like this:

```angular-html "[gravity]=\"[0, -20, 0]\""
<ngtc-physics [gravity]="[0, -20, 0]">
    <!-- content -->
</ngtc-physics>
```

However, the above approach has a few drawbacks:

- Some inputs are missing type information. This is easy to fix though by providing the type argument to `input()`

```angular-ts {'Missing type information': 3-6} {'but we can fix it': 8-9}
@Component({})
export class NgtcPhysics {

    defaultContactMaterial = input({ contactEquationStiffness: 1e6 });
    isPaused = input(false);
    solver = input('GS');


    broadphase = input<NgtcPhysicsInputs['broadphase']>('Naive');
}
```

- Second drawback is that it is hard to observe whenever **any** input changes, kind of like `ngOnChanges`. Moreover, it is also tricky to use all the inputs as an object as an option object to something. For this particular example, we're using the inputs to create a `CannonWorkerAPI` 

```typescript
new CannonWorkerAPI(options);
```

We can fix this second drawback by creating a `computed` with all the inputs

```angular-ts {'1. impl details but afterNextRender to ensure inputs are resolved': 27-28} {'2. call CannonWorkerAPI with options()': 29-30}
import { input, computed } from '@angular/core';

@Component({}) 
export class NgtcPhysics {
    /* truncated */

    options = computed(() => ({
        allowSleep: this.allowSleep(),
        axisIndex: this.axisIndex(),
        broadphase: this.broadphase(),
        defaultContactMaterial: this.defaultContactMaterial(),
        frictionGravity: this.frictionGravity(),
        gravity: this.gravity(),
        isPaused: this.isPaused(),
        iterations: this.iterations(),
        maxSubSteps: this.maxSubSteps(),
        quatNormalizeFast: this.quatNormalizeFast(),
        quatNormalizeSkip: this.quatNormalizeSkip(),
        shouldInvalidate: this.shouldInvalidate(),
        size: this.size(),
        solver: this.solver(),
        stepSize: this.stepSize(),
        tolerance: this.tolerance(),
    }));

    constructor() {
        
        afterNextRender(() => {

            const worker = new CannonWorkerAPI(this.options());
        })
    }
}
```

This is _verbose_ and will be tedious when we have more components that require this approach. As great Angular developers as we all are, we will probably go ahead
and create a [Custom Inject Function (CIF)](./inject-function-the-right-way) for this.

> Please take a look at [ngxtension inputs](https://github.com/ngxtension/ngxtension-platform/blob/main/libs/ngxtension/inject-inputs/src/lib/inject-inputs.ts) for the implementation of this CIF

With that in mind, maintaining components with many inputs with default values is somewhat troublesome with all the workarounds. Here comes Object Inputs

## Object Input approach

Personally, I've voiced my opinion on this before in regards to [Props Spreading](./inputs-service) and many people have told me to use Object Inputs. While I solved the issue with Services but that is also sub-par and we didn't have Signal Input at the time. 

Let's revisit `NgtcPhysics` and turn out inputs into a single `options` input, with the `defaultOptions` object as well

```angular-ts {'providing a single input with defaultOptions as default values': 3-4}
@Component({})
export class NgtcPhysics {

    options = input(defaultOptions);
}
```

This immediately solves both drawbacks of the individual input approach. We don't have to type each individual input and we can use `options()` signal directly without any tedious workaround. Additionally, we can also mark `options` as a required input with `input.required` which is awesome.

However, we have a big issue that is the consumers **cannot** override what they **only** need with our `input()` as-is

```angular-html
<!-- overriding gravity only -->
<ngtc-physics [options]="{ gravity: [0, -20, 0] }">
    <!-- content -->
</ngtc-physics>
```

This does not work because the object `{ gravity: [0, -20, 0] }` that the consumers pass in will **override** the entire `defaultOptions`; so the other default options are lost.

The fix is simple though: `transform` is the answer

```angular-ts {'transforming options on top of defaultOptions': 4-5}
@Component({})
export class NgtcPhysics {
    options = input(defaultOptions, {

        transform: (options: Partial<NgtcPhysicsInputs>) => ({ ...defaultOptions, ...options }),
    });
}
```

Now when the consumers pass in `{ gravity: [0, -20, 0] }`, the `gravity` will override the `defaultOptions.gravity` but the rest of the default options are preserved.

We can now make a reusable transform function to reuse this logic across multiple components/directives

```typescript
export function mergeOptions<TOptions extends object>(defaultOptions: TOptions) {
    return (value: Partial<TOptions>) => ({ ...defaultOptions, ...value });
}
```

Let's refactor `NgtcPhysics`

```angular-ts {'using mergeOptions': 3-4}
@Component({})
export class NgtcPhysics {

    options = input(defaultOptions, { transform: mergeOptions(defaultOptions) });
}
```

## Conclusion

Object Inputs are a great way to provide a single input with default values. This approach is especially useful when we have many inputs with default values. It also allows the consumers to override only the options they want to change. We can also reuse the `transform` function across multiple components/directives to keep our code DRY. 

Have fun and good luck!

## Bonus: Directive with Object Inputs

Directives can use the same approach as the Components. However, the consumers can use our directive with the following approach:

```angular-html "someDirective"
<div someDirective></div>
```

That's right! `someDirective` can match `SomeDirective` with `[someDirective]` as its selector. Imagine `someDirective` is also an option input with default values, Angular Compiler will throw an error saying `'' is not assignable to OptionsType`

```angular-ts
@Directive({ selector: '[someDirective]' })
export class SomeDirective {
    someDirective = input(defaultOptions, { transform: mergeOptions(defaultOptions) });
}
```

The root cause is when we use `<div someDirective></div>`, we provide an empty string `''` to `someDirective` input and that does not pass the type-checking for `Partial<OptionsType>`. We can fix this by modifying `mergeOptions` function as following:

```typescript {'accepting empty string as a valid value': 2-3} {'return defaultOptions for that case': 4-5}
export function mergeOptions<TOptions extends object>(defaultOptions: TOptions) {

    return (value: Partial<TOptions> | '') => {

        if (value === '') return defaultOptions;
        return { ...defaultOptions, ...value };
    };
}
```

Now the consumers can use `<div someDirective></div>` without the compiler errors.
