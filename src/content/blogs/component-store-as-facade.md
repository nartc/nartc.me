---
title: NgRx Component Store as Facade
description: NgRx users are familiar with the Facade pattern and its usefulness. What if I told you there's a new kind of super-power that can take your Facade pattern to the next level, would you believe it? Let's explore together
slug: component-store-as-facade
publishedAt: 2022-09-13
tags: ["Angular", "NgRx"]
draft: true
---

This article assumes the readers' knowledge of [Angular](https://angular.io) and [NgRx](https://ngrx.io).

## NgRx Facade Pattern

The Facade pattern (in NgRx) is a well-known pattern that was popularized from this [blog post](https://thomasburlesonia.medium.com/ngrx-facades-better-state-management-82a04b9a1e39) by [Thomas Burleson](https://twitter.com/ThomasBurleson).

Essentially, instead of having our Components to interact with the NgRx Store via `Actions` and `Selectors`, we would **abstract** these interactions via a `Service` called the Facade.

The following code snippet is a Component interacting with the NgRx Store directly.

```ts
@Component({
	/* hidden for readability */
})
export class BooksPageComponent {
	readonly books$ = this.store.select(booksSelector);

	constructor(private store: Store) {}

	addBook(book: Book) {
		this.store.dispatch(BooksPage.addBook(book));
	}

	deleteBook(id: string) {
		this.store.dispatch(BooksPage.deleteBook(id));
	}

	updateBook(book: Book) {
		this.store.dispatch(BooksPage.updateBook(book));
	}
}
```

With a Facade, we will end up with the following

```ts
@Injectable({ providedIn: "root" })
export class BooksFacade {
	readonly books$ = this.store.select(booksSelector);

	constructor(private store: Store) {}

	addBook(book: Book) {
		this.store.dispatch(addBook(book));
	}

	deleteBook(id: string) {
		this.store.dispatch(deleteBook(id));
	}

	updateBook(book: Book) {
		this.store.dispatch(updateBook(book));
	}
}
```

Then our Component uses the Facade

```ts
@Component({
	/*...*/
})
export class BooksPageComponent {
	readonly books$ = this.booksFacade.books$;

	constructor(private booksFacade: BooksFacade) {}

	addBook(book: Book) {
		this.booksFacade.addBook(book);
	}

	deleteBook(id: string) {
		this.booksFacade.deleteBook(id);
	}

	updateBook(book: Book) {
		this.booksFacade.updateBook(book);
	}
}
```

### Limitations of the Facade pattern?

## NgRx Component Store

### As Facades

## Testing

## Conclusion
