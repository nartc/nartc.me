---
title: Cleaner Abstract Constructors in Angular 14
description: Angular 14 comes with a subtle, yet powerful, change to the Dependency Injection system that might be a game-changer for many Angular developers
publishedAt: 2022-05-17
tags: ["Angular"]
slug: inheritance-angular-inject
---

When working with component-based frameworks, we tend to favor **Composition over Inheritance** because of the flexibility that **Composition** provides. This is especially _true_ in Angular due to **Dependency Injection** and how **Inheritance** in JavaScript works.

Take a look at the following class:

```tsx
@Directive()
export abstract class Instance<TObject> {
	constructor(
		protected serviceOne: ServiceOne,
		protected serviceTwo: ServiceTwo,
		protected tokenOne: TokenOne, // the list can go on and on
	) {}
}
```

This is how one would construct an `abstract class` in Angular and set up Dependencies for that class. Sub-classes can `extends` the base abstract class as follow:

```tsx
@Component({
	providers: [
		/* Concrete class can also override the dependencies here if needed */
	],
})
export class Concrete extends Instance<SomeConcreteEntity> {
	// this.serviceOne is available
	// this.serviceTwo is available
	// this.tokenOne is available
}
```

Thanks to how Angular resolves Dependency Injection, `Concrete` class automatically receives those Injectables **assuming** that:

- `Concrete` does **not** need extra injectables
- `Concrete` constructor is expected to be the **same** as `Instance` constructor

The above constraints are limiting to what we can do with `Instance`'s sub-classes. What if we have extra logic in the sub-class constructor? What if we need to inject more Injectables into the sub-class? Let’s see an example

```tsx
@Component()
export class ConcreteTwo extends Instance<SomeConcreteTwoEntity> {
	// Extreme verbose constructor repeating the injectables 🥲
	constructor(
		serviceOne: ServiceOne,
		serviceTwo: ServiceTwo,
		tokenOne: TokenOne,
		private theOneConcreteTwoNeeds: TheOne,
	) {
		// because we need to call super() and pass those injectables for the base class
		super(serviceOne, serviceTwo, tokenOne);
	}
}
```

Duplicating code is one thing. One important aspect is that now `ConcreteTwo`, or any sub-class of `Instance`, needs to adjust its constructor **AND** tests if `Instance` needs more Injectables in the future. That is painful 😖

We can convert the Inheritance here to Composition by bringing the logic in `Instance` to a Service instead

```tsx
@Injectable()
export class InstanceService {
	constructor /** same DIs as abstract class Instance **/() {}

	/* however, InstanceService does not have ngOnInit life-cycle
	 * so we need to implement some method to call in the component
	 */
	init() {
		// some init logic
	}
}
```

Then use the `InstanceService` as follow

```tsx
@Component({
	providers: [InstanceService],
})
export class Concrete {
	constructor(private instanceService: InstanceService) {}

	ngOnInit() {
		this.instanceService.init();
	}
}
```

This way if `InstanceService` changes in the future, `Concrete` might not need to change its code or tests. However, there are some caveats:

- Services do not have `@Input()` and `@Output()`, what if our `Instance` base class has some common inputs and outputs? There are ways to achieve this but it is verbose, error-prone, and repetitive. Eg: We can have Subjects in the Service and use Setter Inputs to push data through those Subjects
- Because Services do not have `ngOnInit` life-cycle, ALL components that inject `InstanceService` need to manually call `init()` method

Well, Angular 14 comes with a fix that maybe, just maybe, makes Inheritance in Angular viable again

## `inject()`

Here’s the [official documentation on `inject()`](https://angular.io/api/core/inject). TL;DR, when we create `InjectionToken`, we can define some sort of _default value_ for said `InjectionToken` with the following syntax

```tsx
export const MY_TOKEN = new InjectionToken("My Token", {
	factory: () => {
		// we can inject Root Injectables here
		const someOtherToken = inject(SOME_OTHER_TOKEN); // assume SOME_OTHER_TOKEN is provided on the Root injector
		return someOtherToken.someProperty;
	},
});
```

Then we can start using `MY_TOKEN` with `@Inject(MY_TOKEN)`, if we do **not** provide `MY_TOKEN` anywhere in our Injector tree, then the value we define in `factory()` will be used. Then comes this PR: [https://github.com/angular/angular/pull/45991](https://github.com/angular/angular/pull/45991)

The PR makes it possible to use `inject()` in a component’s constructor. One might think “It’s not a big deal” but based on the example above, we see that it is. Let’s rewrite the `Instance` base class:

```tsx
@Directive()
export abstract class Instance<TObject> {
	protected serviceOne = inject(ServiceOne);
	protected serviceTwo = inject(ServiceTwo);
	protected tokenOne = inject(TokenOne);
}
```

Then our `Concrete`

```tsx
@Component()
export class Concrete extends Instance<SomeConcreteEntity> {
	// this.serviceOne, this.serviceTwo, this.tokenOne are all available here

	constructor(private theOneThatConcreteNeeds: TheOne) {
		super();
	}
}
```

This fixes our issue above 🤯! What’s more? `Instance` can have Inputs, Outputs, and it can have life-cycle hooks like `ngOnInit`

```tsx
@Directive()
export abstract class Instance<TObject> {
	ngOnInit() {
		// do initialization stuffs here. Sub-classes will inherit this
	}
}
```

I get very excited because I use Inheritance for [Angular Three](https://github.com/nartc/angular-three) and cannot wait to make this big refactor that reduces the code and complexity by a ton. I hope that you all can find ways to utilize this change to `inject()` in Angular 14 as well.

This is not a blog to promote Inheritance over Composition. This is merely stating the use-case that I run into and how Inheritance helps solve it easier than Composition. There might be other caveats about testability with `inject()`. If you’re interested and curious, hit me up on [Twitter](https://twitter.com/Nartc1410) and I am happy to jump in a call and show you the exact use case.

Have fun and good luck!
