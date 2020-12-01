let resolvedPromise: Promise<void>;

// This is all inspired by https://github.com/facebook/dataloader
// please watch the video to understand how and why.
function enqueuePostPromiseJob(fn: Function) {
  if (!resolvedPromise) {
    resolvedPromise = Promise.resolve();
  }
  resolvedPromise.then(() => process.nextTick(fn));
}

function dispatchQueue<K, V extends Object, R>(updater: Dataupdater<K, V, R>) {
  const queue = updater._queue;
  updater._queue = new Map();

  const updateFn = updater._updateFn;
  Array.from(queue.entries()).forEach(([key, { value, resolve, reject }]) => {
    updateFn({
      key,
      value,
    })
      .then(resolve)
      .catch(reject);
  });
}

/**
 * The batch function is called with this update object.
 */
export type Update<K, V> = {
  /** The key of the entity that will be updated. */
  key: K;
  /** The update that should be applied for this entity. */
  value: V;
};

/**
 * The update function takes a key and an update and returns the updated record type.
 */
export type UpdateFunction<K, V, R> = (update: Update<K, V>) => Promise<R>;

/**
 * This is basically a reimplementation of facebook/dataloader but it is handling the cache a bit
 * differently. Data updater takes two values: The key and the update. It also treats calls of the
 * same key differently: Instead of ignoring the second call and simply returning the cached
 * promise we take the value of the second call and merge it with the queued update.
 *
 * ```js
 * declare var exampleUpdater: Dataupdater<
 *   string,
 *   { a: string, b: string },
 *   { id: string, a: string, b: string },
 * >;
 * exampleUpdater.update('key1', { a: 'a' }); // queue: 'key1' -> { a: 'a' }
 * exampleUpdater.update('key1', { b: 'b' }); // queue: 'key1' -> { a: 'a', b: 'b' }
 * ```
 *
 * Now at the end of the execution cycle the whole update will be applied at once. Like in
 * dataloader both functions return _the same_ promise that applied both updates.
 */
export default class Dataupdater<K, V extends Object, R> {
  // prettier-ignore
  _queue: Map<K, {
    value: V,
    reject: (error: Error) => void,
    resolve: (result: R) => void,
    promise: Promise<R>,
  }>;

  _updateFn: UpdateFunction<K, V, R>;

  constructor(updateFn: UpdateFunction<K, V, R>) {
    this._queue = new Map();
    this._updateFn = updateFn;
  }

  update(key: K, value: V): Promise<R> {
    if (Object.keys(value).length === 0) {
      return Promise.reject(
        new TypeError(
          "Cannot call update function with empty object as value.",
        ),
      );
    }
    const cached = this._queue.get(key);
    if (cached) {
      Object.assign(cached.value, value);
      return cached.promise;
    }

    // @ts-expect-error
    const cachedObject: {
      value: V;
      reject: (error: Error) => void;
      resolve: (result: R) => void;
      promise: Promise<R>;
    } = {};
    cachedObject.value = { ...value };
    const promise = new Promise<R>((resolve, reject) => {
      cachedObject.resolve = resolve;
      cachedObject.reject = reject;
    });
    cachedObject.promise = promise;

    this._queue.set(key, cachedObject);

    if (this._queue.size === 1) {
      enqueuePostPromiseJob(() => dispatchQueue(this));
    }

    return promise;
  }
}
