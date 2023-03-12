---
title: TypeScript Mapped Union Type
description: I'm not sure what to call this but it is a neat trick that will take your TypeScript level to the next level
publishedAt: 2023-03-12
tags: ["TypeScript"]
slug: typescript-mapped-union
---

Recently, a [coworker](https://twitter.com/EnderAgent) at [Nx](https://nx.dev) approaches me with a **TypeScript** problem
that we both thought _"It seems simple"_ at first. We soon find that it's _not as simple as_ we thought. In this blog post,
I'll walk you through the problem, the _seems to be_ solution, the solution, and the thought process behind them.

### The Problem

```ts
declare function table(items: any[], fieldOptions: any[]): void;
```

-   We have a function that accepts some collection of `items` and a collection of `fieldOptions` that should be strongly
    typed to the type of each individual `items`

    ```ts
    declare function table(items: any[], fieldOptions: any[]): void;

    const items = [
        {
            foo: "some foo",
            bar: 123,
        },
        {
            foo: "some foo two",
            bar: 456,
        },
    ];
    ```

-   From this usage, `items` has a type of `Array<{foo: string, bar: number}>` and `fieldOptions` needs to be strongly typed
    against `{foo: string, bar: number}`. Usage of `table()` can be as follow

    ```ts
    const items = [
        {
            foo: "some foo",
            bar: 123,
        },
        {
            foo: "some foo two",
            bar: 456,
        },
    ];

    table(items, [
        "foo",
        {
            field: "bar",
            mapFn: (val) => {
                // should return something. eg: a string
            },
        },
    ]);
    ```

    Here, we can see that `fieldOptions` can accept each key of `{foo: string, bar: number}`, aka `'foo' | 'bar'`. In addition,
    `fieldOptions` can also accept a `FieldOption` object that has a `field: 'foo' | 'bar'` as well as `mapFn` callback that
    will be invoked with the value at `{foo: string, bar: number}[key]`. In other words, when we pass `field: "bar"`, `mapFn`
    then needs to have type: `(value: number) => string` because `bar` has `number` as its valuet type.

### The _"seems to be"_ Solution

At first glance, it seems easy. We'll go through each step.

-   First, `table()` needs to accept a generic to capture the type of each item in `items` collection

    ```diff
    - declare function table(items: any[], fieldOptions: any[]): void;
    + declare function table<TItem>(items: TItem[], fieldOptions: any[]): void;
    ```

    In addition, we also like to constraint `TItem` to an `object` so the consumers can only pass in a collection of
    objects

    ```diff
    - declare function table<TItem>(items: TItem[], fieldOptions: any[]): void;
    + declare function table<TItem extends Record<string, unknown>>(items: TItem[], fieldOptions: any[]): void;
    ```

    `TItem extends Record<string, unknown>` is the constraint

-   Second, we need a type for `fieldOptions`. This type needs to accept a generic that is an object so that we can
    iterate through the object keys

    ```diff
    + type FieldOption<TObject extends Record<string, unknown>> = keyof TObject | {
    +     field: keyof TObject;
    +     mapFn: (value: TObject[keyof TObject]) => string;
    + }

    declare function table<TItem extends Record<string, unknown>>(
        items: TItem[],
    -   fieldOptions: any[],
    +   fieldOptions: FieldOption<TItem>[]
    ): void;
    ```

    With the above type declaration, `FieldOption<{foo: string, bar: number}` is as follow

    ```ts
    type Test = FieldOption<{ foo: string; bar: number }>;
    //    ^?    'foo' |
    //          'bar' |
    //          {
    //              field: 'foo' | 'bar';
    //              mapFn: (value: string | number) => string;
    //          }
    //
    ```

-   This _seems_ correct but when we apply it, we find that the type isn't as strict as we like

    ```ts
    const items = [{ foo: "some foo", bar: 123 }];

    table(items, [
        {
            field: "foo",
            mapFn: (value) => {
                // ^? value: string | number
            },
        },
    ]);
    ```

    We like for `value` to have type of `string` instead of a union `string | number` because we specify the `"foo"`
    for `field`. Hence, `{foo: string, bar: number}['foo']` should be `string`

-   The problem is that TypeScript cannot narrow down `mapFn` from `field` because we cannot constraint them the way
    we currently have our type. Our next step is to try having `keyof TItem` as a generic as well hoping that TypeScript
    can infer it from `field`

    ```ts
    type FieldOption<
        TItem extends Record<string, unknown>,
        TKey extends keyof TItem = keyof TItem
    > =
        | TKey
        | {
              field: TKey;
              mapFn: (value: TKey) => string;
          };
    ```

    But it still won't work because we can never pass a generic in for `TKey` and `TKey` is always defaulted to `keyof TItem`
    which will always be `'foo' | 'bar'` for our `{foo: string, bar: number}` item type. So as of this moment, we're stuck.

    > We spent a good 15-20 minutes trying things out but to no avail.

### The Solution

Out of frustration, I asked for help in [trashh_dev](https://twitter.com/trashh_dev) Discord and [Tom Lienard](https://twitter.com/tomlienard)
provided the solution with a super neat trick. I'll attempt to go through the thought process to understand the solution

What we're stuck on is we're so hung up on the idea of `FieldOption` needs to be an object type `{field: keyof TItem, mapFn}`
but in reality, what we actually need is as follow

```ts
// let's assume we're working with {foo: string, bar: number} for now instead of a generic to simplify the explanation

// what we think we need
type FieldOption = {
    field: "foo" | "bar";
    mapFn: (value: string | number) => string;
};

// what we actually need
type FieldOption =
    | {
          field: "foo";
          mapFn: (value: string) => string;
      }
    | {
          field: "bar";
          mapFn: (value: number) => string;
      };
```

Yes, we need a **Mapped Union** from our `TItem` instead of a single object with **union** properties. The question is how we
get to the **Mapped Union**. Well, it is a 2-step process

1. We need to convert `TItem` into a **Mapped Type**

```ts
type FieldOption<TItem extends Record<string, unknown>> = {
    [TField in keyof TItem]: {
        field: TField;
        mapFn: (value: TItem[TField]) => string;
    };
};

type Test = FieldOption<{ foo: string; bar: number }>;
//   ^? {
//          foo: { field: 'foo'; mapFn: (value: string) => string };
//          bar: { field: 'bar'; mapFn: (value: number) => string };
//      }
```

2. We need to map over the **Mapped Type** with keys of `TItem` to get the **Mapped Union**

```ts
type FieldOption<TItem extends Record<string, unknown>> = {
    [TField in keyof TItem]: {
        field: TField;
        mapFn: (value: TItem[TField]) => string;
    };
}[keyof TItem];

type Test = FieldOption<{ foo: string; bar: number }>;
//   ^? | { field: 'foo'; mapFn: (value: string) => string }
//      | { field: 'bar'; mapFn: (value: number) => string }
```

Now, let's try using `table()` with our **Mapped Union** type to see if it works

```ts
type FieldOption<TItem extends Record<string, unknown>> =
    | keyof TItem
    | {
          [TField in keyof TItem]: {
              field: TField;
              mapFn: (value: TITem[TField]) => string;
          };
      }[keyof TItem];

declare function table<TItem extends Record<string, unknown>>(
    items: TTem[],
    fields: FieldOption<TItem>[]
): void;

const items = [
    { foo: "string", bar: 123 },
    { foo: "string2", bar: 1234 },
];

table(items, [
    {
        field: "foo",
        mapFn: (value) => {
            //  ^? value: string
            return "";
        },
    },
    {
        field: "bar",
        mapFn: (value) => {
            //  ^? value: number
            return "";
        },
    },
]);
```

And that is our solution. So simple, yet so powerful trick. Here's the [TypeScript Playground](https://tsplay.dev/NV305m)
that you can play with.

> If anyone knows the correct term for **Mapped Union**, please do let me know so I can update the blog post.
