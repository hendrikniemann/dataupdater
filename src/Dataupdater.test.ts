import Dataupdater from "./Dataupdater";

type Update = { a?: string; b?: string };

describe("Dataupdater", () => {
  it("executes the callback with a single update", async () => {
    const batchFn = jest.fn(() => Promise.resolve(true));
    const updater = new Dataupdater<number, Update, boolean>(batchFn);

    const update = { key: 1, value: { a: "hello" } };
    await updater.update(update.key, update.value);

    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith(update);
  });

  it("executes the callback twice for two different keys", async () => {
    const batchFn = jest.fn(async ({ key }) => key);
    const updater = new Dataupdater<number, Update, number>(batchFn);

    const update1 = { key: 1, value: { a: "update1" } };
    const update2 = { key: 2, value: { a: "update2" } };
    await Promise.all([
      updater.update(update1.key, update1.value),
      updater.update(update2.key, update2.value),
    ]);

    expect(batchFn).toHaveBeenCalledTimes(2);
    expect(batchFn).toHaveBeenCalledWith(update1);
    expect(batchFn).toHaveBeenCalledWith(update2);
  });

  it("updates are idempotent and return the same promise", async () => {
    const batchFn = jest.fn(async () => true);
    const updater = new Dataupdater<number, Update, boolean>(batchFn);

    const update = { key: 1, value: { a: "hello" } };
    const result1 = updater.update(update.key, update.value);
    const result2 = updater.update(update.key, update.value);

    expect(result1).toBe(result2);
    await result1;

    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith(update);
  });

  it("updates resolve to the return value of the batch function", async () => {
    const updater = new Dataupdater<number, Update, number>(
      async update => update.key,
    );

    const update1 = { key: 1, value: { a: "update1" } };
    const update2 = { key: 2, value: { a: "update2" } };
    const result1 = updater.update(update1.key, update1.value);
    const result2 = updater.update(update2.key, update2.value);
    expect(result1).resolves.toBe(update1.key);
    expect(result2).resolves.toBe(update2.key);
  });

  it("merges updates to the same key into a single object", async () => {
    const batchFn = jest.fn(async () => true);
    const updater = new Dataupdater<number, Update, boolean>(batchFn);

    const result1 = updater.update(1, { a: "a" });
    const result2 = updater.update(1, { b: "b" });

    expect(result1).toBe(result2);
    await result1;

    expect(batchFn).toHaveBeenCalledTimes(1);
    expect(batchFn).toHaveBeenCalledWith({ key: 1, value: { a: "a", b: "b" } });
  });
});
