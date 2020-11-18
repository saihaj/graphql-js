/**
 * Memoizes the provided three-argument function.
 */
export default function memoize3<
  A1 extends {} | ReadonlyArray<unknown>,
  A2 extends {} | ReadonlyArray<unknown>,
  A3 extends {} | ReadonlyArray<unknown>,
  R extends unknown
>(
  fn: (arg0: A1, arg1: A2, arg2: A3) => R,
): (arg0: A1, arg1: A2, arg2: A3) => R {
  let cache0;

  return function memoized(a1, a2, a3) {
    if (!cache0) {
      cache0 = new WeakMap();
    }
    let cache1 = cache0.get(a1);
    let cache2;
    if (cache1) {
      cache2 = cache1.get(a2);
      if (cache2) {
        const cachedValue = cache2.get(a3);
        if (cachedValue !== undefined) {
          return cachedValue;
        }
      }
    } else {
      cache1 = new WeakMap();
      cache0.set(a1, cache1);
    }
    if (!cache2) {
      cache2 = new WeakMap();
      cache1.set(a2, cache2);
    }
    const newValue = fn(a1, a2, a3);
    cache2.set(a3, newValue);
    return newValue;
  };
}