---
title: "Angular v22 @Service(): Fine, But Why?"
description: Some thoughts on Angular v22 @Service(), Injectable, root providers, local providers, and the overloaded Service term.
publishedAt: 2026-06-18
tags: ["Angular"]
slug: angular-v22-service
draft: true
---

Angular v22 has a new [`@Service()`](https://angular.dev/api/core/Service) decorator.

```ts
import { Service, inject } from '@angular/core';

@Service()
export class UserService {
    private readonly http = inject(HttpClient);
}
```

At a high level, this is the new ergonomic version of:

```ts
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserService {
    private readonly http = inject(HttpClient);
}
```

There are details:

- `@Service()` is auto-provided by default
- it pairs with `inject()` instead of constructor injection
- it has `autoProvided: false` if we do not want automatic provider registration
- for more complex DI configuration, `@Injectable()` is still there

This blog post is not really about the syntax though.

I think I am in the minor camp here, but I do not like this addition that much, not because it breaks anything or because
`@Service()` is hard to understand, but because I do not think it adds much over an API that is already completely fine:
`@Injectable()`. On top of that, I have always disliked the term `Service` in Angular.

## Service as a junk drawer

In Angular, `Service` usually means "anything that is not a UI building block".

- Not a Component? Service.
- Not a Directive? Service.
- Not a Pipe? Service.
- Need to fetch data? Service.
- Need to map data? Service.
- Need to store some state? Service.
- Need a place to put code because the Component is getting too big? Service.

That last one is where I think the term starts doing damage. It becomes a junk drawer.

```ts
@Service()
export class UserService {}
```

What does this do? Does it talk to `/api/users`? Then maybe it is a `UserClient`.

```ts
@Service()
export class UserClient {
    private readonly http = inject(HttpClient);

    getUsers() {
        return this.http.get<User[]>('/api/users');
    }
}
```

Does it transform API data into a view model? Then maybe it is a `UserMapper` or `UserTransformer`.

```ts
@Service()
export class UserMapper {
    toViewModel(user: User): UserViewModel {
        return {
            name: `${user.firstName} ${user.lastName}`,
            avatarUrl: user.avatar_url,
        };
    }
}
```

Does it hold state? Then maybe it is a `UserStore`.

```ts
@Service()
export class UserStore {
    readonly selectedUser = signal<User | null>(null);
}
```

- Does it authenticate? Maybe `Authenticator`.
- Does it calculate? Maybe `Calculator`.
- Does it queue work? Maybe `Queue`.
- Does it coordinate some process? Maybe `Workflow`, `Coordinator`, `Engine`, `Manager`, whatever makes sense for that domain.

We can even argue that `UserMapper` and `UserStore` might be one thing in some applications. Maybe the store exposes a
view model instead of raw API data. That is fine. The point is not to bikeshed exact names. The point is to make the name
carry some intent.

None of these names are universally correct. Naming is still hard. But at least they force us to answer the question:

> What does this thing actually do?

`Service` lets us skip that question.

## The root-first part

The second thing that bothers me is that `@Service()` is mostly positioned as a replacement for
`@Injectable({ providedIn: 'root' })`. I know this is how many Angular apps are written. Generate a service, root provided,
move on.

```ts
@Injectable({ providedIn: 'root' })
export class SomeService {}
```

This is a completely okay API. I do not have a problem with `@Injectable({ providedIn: 'root' })` itself. What I do not
like is the habit around it: start everything at the root. Personally, I prefer local-first providers. If I need an
injectable symbol, I usually start here:

```ts
@Injectable()
export class UserStore {}

@Component({
    selector: 'app-user-page',
    template: `...`,
    providers: [UserStore],
})
export class UserPage {}
```

or here:

```ts
export const userRoutes: Routes = [
    {
        path: 'users',
        providers: [UserStore],
        loadComponent: () => import('./user-page'),
    },
];
```

or sometimes at a Directive level:

```ts
@Directive({
    selector: '[userSelection]',
    providers: [UserSelectionStore],
})
export class UserSelectionDirective {}
```

Then I promote it upward when the usage actually needs it. Local first is enough.

- If a `UserStore` only exists for a page, why should it be a root singleton?
- If a `DraftStore` only exists while an editor is mounted, why should the whole app be able to inject it?
- If a workflow only matters inside a route, why does it need to live forever?

Root is convenient, but root is also a design decision.

This is probably why `@Service()` does not excite me that much. It takes the most convenient version of `@Injectable()`
and makes that the nice-looking API. I get that most people want root services most of the time, but I am just not sure
that is the direction I want to encourage more.

## Root singletons are not free

I am not saying root providers are bad. Some things are absolutely root-level things.

```ts
@Injectable({ providedIn: 'root' })
export class AuthClient {}
```

Sure. API clients talk to the backend and usually do not hold component-level state. Root can make sense there.

```ts
@Injectable({ providedIn: 'root' })
export class FeatureFlagClient {}
```

Sure. Flags can be loaded as configuration once and used as a singleton.

```ts
@Injectable({ providedIn: 'root' })
export class AnalyticsTracker {}
```

Sure. Analytics is usually a single integration point for the whole app.

But root-provided state and root-provided behavior can also make things too easy to reach for. Once a local detail is
root-provided, it becomes easy for unrelated code to depend on it. This is how a vague `UserService` slowly becomes app
architecture.

```ts
@Service()
export class UserService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);

    readonly selectedUser = signal<User | null>(null);

    getUsers() {}
    createUser() {}
    deleteUser() {}
    mapUser() {}
    canEditUser() {}
    navigateToUser() {}
    showUserCreatedToast() {}
}
```

This is no longer a service, but a junk pile. And because it is root-provided, the pile is now available to the whole
application.

## Does `@Service()` add much?

This is where I agree with some of the other folks who are not excited about this API. It adds very little technical value.
We already have this:

```ts
@Injectable({ providedIn: 'root' })
export class Authenticator {
    private readonly authClient = inject(AuthClient);

    login(credentials: Credentials) {
        return this.authClient.login(credentials);
    }
}
```

And now we have this:

```ts
@Service()
export class Authenticator {
    private readonly authClient = inject(AuthClient);

    login(credentials: Credentials) {
        return this.authClient.login(credentials);
    }
}
```

This is shorter and nice, but is that enough? I am not sure. It also means tutorials, docs, examples, lint rules,
schematics, blog posts, and AI-generated code now have one more thing to choose from.

- Do we use `@Injectable()`?
- Do we use `@Service()`?
- When do we use `@Service({ autoProvided: false })` instead of `@Injectable()`?
- Why does `@Service()` not support constructor injection?
- Should new developers learn both?

None of these questions are impossible to answer. But they are questions we did not have before. And for what? Mostly
fewer characters. That feels like a bad tradeoff to me.

For local state, I still prefer this:

```ts
@Injectable()
export class LocalDraftStore {}

@Component({
    providers: [LocalDraftStore],
})
export class DraftEditor {}
```

Yes, this could be:

```ts
@Service({ autoProvided: false })
export class LocalDraftStore {}
```

But that reads crazy to me. If I am explicitly turning off the main thing `@Service()` gives me, I might as well keep using
`@Injectable()`.

## `@Injectable()` is already okay

`@Injectable()` is a good name. It says the class participates in Angular DI, not what architectural role the class has.

```ts
@Injectable()
export class UserMapper {}
```

This is injectable. Great.

```ts
@Injectable()
export class UserStore {}
```

This is injectable too. Great.

```ts
@Injectable({ providedIn: 'root' })
export class Authenticator {}
```

This one is injectable and root-provided. Also great. The word `Injectable` is technical, but at least it is precise. It
describes the framework capability and does not ask me to call everything a service. With `@Service()`, Angular is giving
us a nicer shortcut, but also blessing the word `Service` even more, and that is the part I am not sure I like.

## What I will probably do

For new Angular v22 app code, I think my rule will be something like this:

- If it is truly root-level and uses `inject()`, `@Service()` is fine, I guess.
- If it is local to a component, directive, or route, start with `@Injectable()` and local providers.
- If it is a library that supports Angular versions before v22, keep `@Injectable()`.
- If the class name ends with `Service`, pause and ask what it actually does.

## Conclusion

`@Service()` is fine. I just do not think it is very interesting, and `Service` as a design term is still too vague for my
taste. I know many Angular developers will use `@Service()` everywhere and be perfectly happy with it. That is okay. But
for the way I like to structure Angular code, `@Injectable()` without `providedIn: 'root'` is still where many things
should start. Local first. Promote when needed. Name things by what they actually do.

Thanks for reading, and have fun!
