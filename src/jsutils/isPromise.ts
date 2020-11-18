/**
 * Returns true if the value acts like a Promise, i.e. has a "then" function,
 * otherwise returns false.
 */
declare function isPromise(value: unknown): boolean;

// eslint-disable-next-line no-redeclare
export default function isPromise(value) {
  return typeof value?.then === 'function';
}