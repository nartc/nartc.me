---
title: InjectionToken as a Service
description: (hot take) I want to use InjectionToken for almost all my services
publishedAt: 2023-05-30
tags: ["Angular"]
slug: injection-token-service
---

Up until recently, [Angular](https://angular.io) has been a hard-core class-based framework: Component, Directive, Pipe, Guard, Interceptor, Service, etc... Everything has been a [TypeScript](https://typescriptlang.org) class. Nowadays, Angular provides more **functional** APIs: Functional Guard, Functional Interceptor, and Functional Resolver.

These functional APIs are great and if you haven't tried them out, I'd highly recommend that you do because they do **improve the authoring experience**.

Now, let's take a quick look at Component, Directive, and Pipe

```ts
@Component({
    /*...*/
})
export class UserComponent {}

@Directive({
    /*...*/
})
export class UserDirective {}

@Pipe({
    /*...*/
})
export class UserPipe {}
```

All three of these building blocks have their dedicated [Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html), which means that we do not have much choice than to use classes for Component, Directive, and Pipe. What's left?

## Service

Yes, we have **Service**, _the lord of general usage_. If you haven't noticed, Guard, Interceptor, and Resolver are all Services. What Angular developers are so fixtated on is that Service has to be a TypeScript class. Functional Guard/Resolver/Interceptor prove that to be not the case. So, for general-usage Service, what can we do today?

Let's say we have a `GithubUserService`, that is `providedIn: 'root'`, with the following requirements:

-   It needs to inject `HttpClient` to make network calls
-   It needs to expose a method `searchUser(query?: string)` to search for Github users based on a query

Any Angular developer should be able to write this Service in a heartbeat

```ts
@Injectable({ providedIn: "root" })
export class GithubUserService {
    private readonly http = inject(HttpClient);
    // or using true-private field
    // readonly #http = inject(HttpClient);

    searchUser(query = "") {
        return this.http.get<GithubUser[]>(`path/to/github-api?q=${query}`);
    }
}
```

Everything about this `GithubUserService` is completely fine. Some folks _might_ complain a bit about **Testability** in terms of
Services and `inject()`. I too would prefer the ability to test Services with `new ()` syntax but that is a topic for another day.
Next, I'd like to introduce an alternative to writing Services in Angular.

## Injection Token

Many Angular developers, including Senior ones, are not familiar with [InjectionToken](https://angular.io/api/core/InjectionToken). Even if they know `InjectionToken`, a lot of developers do not utilize them _enough_. For this blog post, I'll be using `InjectionToken` to write a concise and easy to test **Service**

> To spare me the heated arguments, I want to emphasize that this idea is purely **exploratory** at this point.

Let's rewrite `GithubUserService` using `InjectionToken`. For this, we'll have two separate units: a **Factory Function** and an **Injection Token**

```ts
// github-user.factory.ts
export function githubUserServiceFactory(http: HttpClient) {
    return {
        searchUser: (query = "") =>
            http.get<GithubUser[]>(`path/to/github-api?q=${query}`),
    };
}

// utilize TypeScript Utility Types
export type GithubUserServiceApi = ReturnType<typeof githubUserServiceFactory>;
```

```ts
// github-user.token.ts
export const GITHUB_USER_SERVICE = new InjectionToken<GithubUserServiceApi>(
    "Github User Service",
    { factory: () => githubUserServiceFactory(inject(HttpClient)) },
);
```

Imagine our file structure is as follow:

```
.
└── github-user/
    ├── github-user.factory.ts
    ├── github-user.token.ts
    └── index.ts
```

We can **choose** to expose the Injection Token for consumers and keep the implementation (Factory Function) as private API to `github-user` library.

> This argument makes more sense for folks who work in a monorepo setup where each specific piece of functionality is a **library** that exposes its Public API for the rest of the monorepo.

#### Testing

As far as testing goes, we only care about testing our implementation details, `githubUserServiceFactory`, which is just a **function**.

```ts
describe(githubUserServiceFactory.name, () => {
    let mockedHttpClient: jasmine.SpyObj<HttpClient>;
    let service: GithubUserServiceApi;

    beforeEach(() => {
        mockedHttpClient = jasmine.createSpyObj(/*...*/);
        service = githubUserServiceFactory(mockedHttpClient);
    });

    it("should search user", () => {
        /* test searchUser */
    });
});
```

Pretty cool right? We can still use `inject()` and keep tests as simple as possible.

### Atomic Token

Previously, we implemented `GithubUserService` as an `InjectionToken` with a factory function. The return value of our factory is to mimic that of a class-based service. What if we **only** ever need `searchUser()` method? Luckily, using `InjectionToken` provides us this flexibility to return what we **actually** need.

```ts
export function githubUserSearchFactory(http: HttpClient) {
    return (query = '') => http.get<GithubUser[]>(`path/to/github-api?q=${query}`);

export type GithubUserServiceApi = ReturnType<typeof githubUserSearchFactory>;
```

> Our `github-user.token.ts` stays mostly the same, with some name changes because we change our factory function name

When we use this in a Component, our code looks like the following:

```ts
@Component(/*...*/)
export class UserComponent {
    private readonly searchGithubUser = inject(GITHUB_USER_SEARCH);

    readonly users$ = this.query$.pipe(
        switchMap((query) => this.searchGithubUser(query)),
    );
}
```

This approach also allows us to separate tests, separate implementation details with different arguments. All functions do not **necessarily** share all of the Dependencies

### Life-cycle hooks

As of this moment, the only life-cycle hook that we care about for Services is `ngOnDestroy`. From Angular 16, we have a new token, [DestroyRef](https://netbasal.com/getting-to-know-the-destroyref-provider-in-angular-9791aa096d77?gi=eb7e68b4c77a), as a way to implement a clean-up mechanism for our Service. Let's rewrite our factory to also expose more than just a `searchUser` function

```ts
export function githubUserServiceFactory(
    http: HttpClient,
    destroyRef: DestroyRef,
) {
    const query$ = new BehaviorSubject("");

    destroyRef.onDestroy(() => {
        query$.complete();
    });

    return {
        setQuery: (query: string) => void query.next(query),
        users$: query$.pipe(
            switchMap((query) => http.get(`path/to/github-api?q=${query}`)),
        ),
    };
}

export type GithubUserServiceApi = ReturnType<typeof githubUserServiceFactory>;
```

With this, let's assume that our Service is no longer a Root Service so we need to rewrite the Token

```ts
export const GITHUB_USER_SERVICE = new InjectionToken<GithubUserServiceApi>(
    "Github User Service",
);

export function provideGithubUserService() {
    return {
        provide: GITHUB_USER_SERVICE,
        useFactory: githubUserServiceFactory,
        // let Angular DI knows what our Factory needs
        deps: [HttpClient, DestroyRef],
    };
}
```

We're ready to use this in **ANY** Component that needs `GithubUserServiceApi`

```ts
@Component({
    template: `
        <input (input)="githubUserService.setQuery($event.target.value)" />
        <ul>
            <li *ngFor="let user of githubUserService.users$ | async"></li>
        </ul>
    `,
    providers: [provideGithubUserService()],
})
export class UserComponent {
    readonly githubUserService = inject(GITHUB_USER_SERVICE);
}
```

### Dealing with ComponentStore/RxState-like API

One limitation with this approach is how we can leverage APIs like [ComponentStore](https://ngrx.io/guide/component-store) or [RxState](https://www.rx-angular.io/docs/state).

Usually, the way to consume these APIs is to `extends ComponentStore<>` or `extends RxState<>`. However, we cannot `extends` because we have no class. The only thing that we care about when `extends ComponentStore<>` is for the Component Store to automatically run its destroy logic. Once again, `DestroyRef` to the rescue

```ts
export function userStoreFactory(destroyRef: DestroyRef) {
    const store = new ComponentStore(initialUserState);

    destroyRef.onDestroy(() => {
        // let's call ngOnDestroy manually here
        store.ngOnDestroy();
    });

    // now we can work with ComponentStore API and return exactly what we need
}

export type UserStoreApi = ReturnType<typeof userStoreFactory>;
```

```ts
export const USER_STORE = new InjectionToken<UserStoreApi>("UserStore");
export function provideUserStore() {
    return {
        provide: USER_STORE,
        useFactory: userStoreFactory,
        deps: [DestroyRef],
    };
}
```

> The same can be applied to `RxState`

#### Using `provider`

Alternatively, we can provide then inject `ComponentStore` instead of `new ComponentStore()` since some library author might expose their API as an Abstract Class, or you simply do not like calling `new` or `ngOnDestroy()` manually

```ts
export function userStoreFactory(store: ComponentStore<UserState>) {
    // work with ComponentStore API and return exactly what we need
}
```

```ts
export const USER_STORE = new InjectionToken<UserStoreApi>("UserStore");
export function provideUserStore(initialUserState: Partial<UserState> = {}) {
    return [
        ComponentStore,
        { provide: INITIAL_STATE_TOKEN, useValue: initialUserState },
        {
            provide: USER_STORE,
            useFactory: userStoreFactory,
            deps: [ComponentStore],
        },
    ];
}
```

> `INITIAL_STATE_TOKEN` is imported from `@ngrx/component-store`

#### Possibilities

This approach opens up new possibility: configurable component store. Let's say we want to reuse our `UserStoreApi` but we want the consumers to have the ability to configure its initial state.

We definitely can expose `setState` on `UserStoreApi` and call `setState` where we use `UserStoreApi` to set the initial state. The limitation to this is we cannot call `setState` if we are to provide `UserStoreApi` on the Route-provider level.

On the other hand, we can turn our `userStoreFactory` into a higher-order function to accept some initial state.

```ts
export function userStoreFactory(initialState: UserState) {
    return (destroyRef: DestroyRef) => {
        const store = new ComponentStore(initialState);
        /* ... */
    };
}

// double return type 😎
export type UserStoreApi = ReturnType<ReturnType<typeof userStoreFactory>>;
```

```ts
export const USER_STORE = new InjectionToken<UserStoreApi>("User Store");

export function provideUserStore(initialState: UserState) {
    return {
        provide: USER_STORE,
        useFactory: userStoreFactory(initialState),
        deps: [DestroyRef],
    };
}
```

Now, we can provide different initial `UserState` when we call `provideUserStore()`; on Component-provider level, or on Route-provider level.

> The same can be applied when use `provider`

### Conclusion

We briefly went over the current APIs on Angular's building blocks and learned that some of the Angular APIs have gone away from Class-based approach. We also explored a new approach to writing Services using `InjectionToken`. Hopefully, I'm able to express my thoughts on this new approach and you learn something from this post whether or not you agree with me. Thank you for reading.

### Updates

#### Nov 24 2023

I have been using this approach for the past 6 months or so and it works great for my **libraries**. Since I used it so much, I've created a utility available in [`ngxtension`](https://ngxtension.netlify.app) called `createInjectionToken`

### FAQs

**1. What is the practicality of this approach?**

Good question and I'll be honest. Nothing presented here have made it to any enterprise applications that I'm a part of. That said, I do use the approach in my side projects.

**2. I like it, but is it too verbose to write?**

Yes, it is a bit verbose. We can always abstract the creation of the Injection Token and the Factory Function to a utility function. Something like the following:

```ts
export const [injectFn, provideFn, TOKEN] = createInjectionToken(theFactory, {
    deps: [
        /*...*/
    ],
    isRoot: boolean,
});
```

Here's a [Github Gist](https://gist.github.com/nartc/daddaec236e7723409d864fa25b5d63f) for one implementation of such utility.

**3. What can we use if we don't have `DestroyRef`?**

It is a unfortunate because `DestroyRef` really does help. In older versions, you can _maybe_ try the following hack:

```ts
const viewRef = inject(ChangeDetectorRef) as ViewRef;

queueMicrotask(() => {
    viewRef.onDestroy(() => {});
});
```

**4. Is `InjectionToken` not a Singleton ?**

Yes, by default, `new InjectionToken('description')` is just a token that you need to **provide** something for it before you can **inject** it. However, `new InjectionToken('description', {factory: () => {}})` is `providedIn: 'root'` by default. Hence, the approach introduced here does give you a Singleton. However, this is all **configurable** per situation.

**5. Application code vs Library code?**

I did not think about this when I write the blog post but I think I subconsciously lean towards **Library Author**.

### Special Thanks

This blog post is a bit in the exploratory space so I asked several of my friends in the community to review

-   [Enea Jahollari](https://twitter.com/Enea_Jahollari)
-   [Brandon Roberts](https://twitter.com/brandontroberts)
-   [Jason Warner](https://twitter.com/xocomil_1)
-   [Tomas Trajan](https://twitter.com/tomastrajan)
-   [Justin Rassier](https://twitter.com/justinrassier)
-   [Ady Ngom](https://twitter.com/adyngom)
-   [Colum Ferry](https://twitter.com/FerryColum)
