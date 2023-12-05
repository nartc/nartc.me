---
title: ngxtension createInjectionToken - Simplify Angular InjectionToken
description: Explore how ngxtension's createInjectionToken simplifies Angular dependency injection and empowers your development workflow.
slug: create-injection-token
publishedAt: 2023-10-09
tags: ["Angular"]
---

Recently, [`InjectionToken`](https://angular.io/api/core/InjectionToken) has gained popularity for its versatility, especially when combined with the [`inject`](https://angular.io/api/core/inject) function, which simplifies the consumption of `InjectionToken` and adds type safety.

Despite these advantages, using `InjectionToken` can still present challenges in terms of developer experience (DX). In this post, we'll dive into these challenges and demonstrate how [`createInjectionToken`](https://ngxtension.netlify.app/utilities/injectors/create-injection-token/) from `ngxtension` offers solutions to enhance your Angular development workflow.

## Understanding `InjectionToken`

> Creates a token that can be used in a DI Provider.

While the [Angular Documentation](https://angular.io) provides a formal definition, in simpler terms, we can describe `InjectionToken` as the most basic unit that can participate in Angular's Dependency Injection (DI) system. Unlike traditional class-based providers, `InjectionToken` can be as minimal as a `string`, a `number`, or an array etc., serving as a versatile and compact building block for DI configurations.

We can create an `InjectionToken` by creating a new instance of the `InjectionToken` class

```ts
const BASE_URL = new InjectionToken<string>("Base URL");
```

Next, we can provide values for this token

```ts
// application wise
bootstrapApplication(AppComponent, {
    providers: [{ provide: BASE_URL, useValue: "http://base.url" }],
});

// route (sub-tree)
const routes: Routes = [
    {
        path: "",
        providers: [{ provide: BASE_URL, useValue: "http://route-base.url" }],
    },
];

// component/directive
@Component({
    providers: [{ provide: BASE_URL, useValue: "http://component-base.url" }],
})
export class MyCmp {}
```

Finally, we can consume this token

```ts
@Component({})
export class MyCmp {
    baseUrl = inject(BASE_URL); // string
}
```

> Note that Angular DI is [hierarchical](https://angular.io/guide/hierarchical-dependency-injection) so `inject(BASE_URL)` will retrieve the value from the closest `Injector` that provides a value for `BASE_URL`

## Challenges with `InjectionToken`

In its basic form, `InjectionToken` suffices for the needs of most Angular users. However, some users encounter challenges when dealing with more advanced use cases, making it difficult to promote widespread adoption of these advanced `InjectionToken` features.

### 1. Type-safe provider

The initial challenge we encounter is not an advanced use case; rather, it's primarily a concern related to DX. Let's review the process of providing a value for an `InjectionToken`.

```ts
{ provide: BASE_URL, useValue: 'the value' }
```

In this example, the `useValue` property has the potential to accept **virtually any value**, even when `TOKEN` is explicitly defined as an `InjectionToken<string>`. For instance, we can inadvertently provide a `number` as the value for `TOKEN`:

```ts
{ provide: BASE_URL, useValue: 234 }
```

To compound the issue further, we might inadvertently assign a value that shares some of its APIs with a `string`, such as an `Array`:

```ts
{ provide: BASE_URL, useValue: ['hi', 'world'] }

const baseUrl = inject(BASE_URL);
baseUrl.slice(0, 1);
```

In this last scenario, the subtlety of the issue may go unnoticed until unexpected behavior surfaces in the UI.

However, there is a straightforward solution at hand. We can create a custom `provide` function (no pun intended!) that allows consumers to supply the intended value type:

```ts
export const BASE_URL = new InjectionToken<string>("Base URL");

//                                      👇 Enforce value type constraints
export function provideBaseUrl(value: string) {
    return { provide: BASE_URL, useValue: value };
}
```

With this approach, consumers now have a clear and type-safe way to provide values for `BASE_URL`:

```ts
bootstrapApplication(AppComponent, {
    providers: [
        provideBaseUrl("http://base.url"),
        provideBaseUrl(123), // a value other than `string` will surface as a compilation error
    ],
});
```

By using the `provideBaseUrl` function, we ensure that only values of the correct type are accepted, effectively eliminating the type-safety issue.

### 2. Did I mention type-safety?

We've previously highlighted that `useValue` lacks strong typing, and this limitation extends to other providers like `useFactory` as well.

```ts
{ provide: BASE_URL, useFactory: () => ['we', 'can', 'do', 'whatever']}
```

To address this issue, we can employ our custom provide function:

```ts
export function provideBaseUrl(url: string | (() => string)) {
    return {
        provide: BASE_URL,
        useFactory: typeof url === "function" ? url : () => url,
    };
}
```

With this custom function, providing values for `BASE_URL` becomes more type-safe:

```ts
provideBaseUrl("http://raw.value.url");
provideBaseUrl(() => {
    // Note: We can utilize DI in here via `inject()`
    return "http://factory.value.url";
});
```

However, the real challenge arises from the varying providers that Angular's DI can accept, such as

-   `useFactory` with `deps`. `Provider` interface will not enforce the dependencies for a `useFactory`
-   `multi` token. Handling the `multi` token use-case is tricky because the `InjectionToken` type differs from the value provider type

Adapting our custom provide function to handle these different cases can become a constant task.

### 3. Different ways to achieve the same thing

The `InjectionToken` provides more flexibility than just using `new InjectionToken(description)`. Specifically, it allows for the use of a **factory function**, which can change how the `InjectionToken` is consumed.

```ts
export const BASE_URL = new InjectionToken("Base URL", {
    factory: () => {
        return "http://default.url";
    },
});
```

When a **factory function** is provided, it introduces two key characteristics to the token:

-   `BASE_URL` is provided in the Root Injector by default (i.e: `providedIn: 'root'`). This effectively makes `BASE_URL` a [Tree-shakable Token](https://angular.io/api/core/InjectionToken#tree-shakable-injectiontoken)
-   We can consume `BASE_URL` without the need to explicitly provide a value for it if we utilize DI in the factory function to access other dynamic values.

A few months back, I penned a [(hot take) blog post on using `InjectionToken` as a Service](/blog/injection-token-service) and have since implemented this approach in various libraries. Throughout this journey, I've experienced the challenges of utilizing `InjectionToken` and, more notably, explaining its advanced usages to others.

## Enter `createInjectionToken`

To simplify the usage of nearly all `InjectionToken` instances across my projects, I've created a utility called `createInjectionToken`.

`createInjectionToken` is a function that takes a factory function and additional options as parameters. The result of calling `createInjectionToken` is a tuple `[injectFn, provideFn, TOKEN]`, offering both convenience in usage and flexibility for consumers to rename these components as needed.

### 1. Creating a root token

```ts
export const [injectFn, provideFn, TOKEN] = createInjectionToken(
    () => "root factory",
);
```

By default, `createInjectionToken` creates a root token. The consumers can immediately retrieve the value by calling `injectFn`

```ts
export class MyCmp {
    value = injectFn(); // string
}
```

### 2. Creating a non-root token

```ts
export const [injectFn, provideFn, TOKEN] = createInjectionToken(
    () => "non root factory",
    { isRoot: false },
);
```

To create a non-root token, pass `isRoot: false` to the 2nd argument of `createInjectionToken`. Now, the consumers need to provide the value for the token by invoking `provideFn()` before they can retrieve the value with `injectFn()`

```ts
@Component({
    //              👇 automatically use the factory function
    providers: [provideFn()],
})
export class MyCmp {
    value = injectFn(); // string
}
```

#### `injectFn`

As the name suggests, `injectFn` is a [CIF (Custom Inject Function)](/blog/inject-function-the-right-way) for effortlessly accessing the token's value:

```ts
injectFn(); // string
```

Furthermore, `injectFn` offers a high degree of type-safety by accepting an `InjectOptions` object, enabling precise control over the **Resolution Modifier**:

```ts
export class MyCmp {
    value = injectFn({ self: true }); // string
    parentValue = injectFn({ skipSelf: true, optional: true }); // string | null
}
```

Importantly, `injectFn` is equipped to handle the subtleties of the **Injection Context** by accepting an optional `Injector`:

```ts
export class MyCmp {
    injector = inject(Injector);

    ngOnInit() {
        const baseUrl = injectFn({ injector: this.injector }); // Functions seamlessly, returning a string
    }
}
```

This comprehensive functionality enhances both usability and type safety.

### 3. Creating a Token with Dependencies

```ts
export const [injectDep, provideDep, DEP] = createInjectionToken(() => 1);

export const [injectFn, provideFn, TOKEN] = createInjectionToken(
    (dep: number) => dep * 2,
    //        👇 This is strongly typed based on the parameters of the factory function
    { deps: [DEP] },
    // { deps: [] }, // Compilation error
    // { deps: [OTHER_DEP_THAT_IS_NOT_NUMBER] }, // Compilation error
    // { deps: [DEP, SOME_OTHER_DEP] }, // Compilation error
);
```

You can create a token that depends on other tokens by simply configuring the factory function to accept specific arguments and providing those dependencies through the strongly-typed `deps` option. The rules of Hierarchical Dependency Injection still apply in this context.

```ts
export class MyCmp {
    value = injectFn(); // 2 (1 * 2)
}
```

When `isRoot` is set to `false`, consumers must first provide the value using `provideFn()` before they can access it with `injectFn()`.

```ts
@Component({
    providers: [provideDep(5), provideFn()],
})
export class MyCmp {
    value = injectFn(); // 10
}
```

This approach allows you to create tokens with dependencies while maintaining strong typing and adherence to the principles of Hierarchical Dependency Injection.

### 4. Creating a `multi` Token

```ts
export const [injectLocales, provideLocale] = createInjectionToken(() => "en", {
    multi: true,
});
```

By setting `multi` to `true`, we've defined a `multi` token. When `multi` is enabled, the behavior of `injectFn` and `provideFn` undergoes a slight change.

```ts
@Component({
    providers: [
        provideLocale(), // Provides the first value using the factory function
        provideLocale("es"), // Provides the second value. Note that it accepts a string instead of a string[]
        provideLocale(() => "fr"), // Provides the third value using a factory function
    ],
})
export class MyCmp {
    locales = injectLocales(); // ['en', 'es', 'fr']
}
```

It's important to highlight that a `multi` token will automatically set `isRoot` to `false`.

`createInjectionToken` is made publicly available via [ngxtension](https://ngxtension.netlify.app). Check the [documentation](https://ngxtension.netlify.app/utilities/injectors/create-injection-token/) for more details.

## Conclusion

In conclusion, we've embarked on a journey to unravel the intricacies of Angular's Dependency Injection system and explore how `InjectionToken` can sometimes pose type-safety and developer experience challenges. Along the way, we've introduced a valuable tool in the form of `createInjectionToken`, a utility that simplifies the process of creating and consuming tokens while enhancing type safety.

Check out [ngxtension](https://ngxtension.netlify.app) for more cool utilities. Until next time 👋
