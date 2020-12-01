# Dataupdater

This is a library that is inspired by [Dataloader](https://github.com/graphql/dataloader). Dataupdater batches and merges updates to the same key in a single object and calls the update function for every key-update pair once.We use Dataupdater to batch the updates to the same entity and run a single SQL query.

## Usage

Pretty much like Dataloader, but instead of an array of keys, the batch function gets a single object with the properties `key` and `value`.

```ts
const updater = new Dataupdater((update: { a: string; b: string }) => {
  console.log(update);
  return update.value;
});

const a1 = updater.update(1, { a: "a1" });
const b1 = updater.update(1, { b: "b1" });
const a2 = updater.update(2, { a: "a2" });

await Promise.all([a1, b1, a2]);
// logs to console:
// { key: 1, value: { a: "a1", b: "b1" } }
// { key: 2, value: { a: "a2" } }
```
