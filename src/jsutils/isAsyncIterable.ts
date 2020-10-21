/**
 * Returns true if the provided object implements the AsyncIterator protocol via
 * either implementing a `Symbol.asyncIterator` or `"@@asyncIterator"` method.
 */
export function isAsyncIterable(
  maybeAsyncIterable: unknown,
): maybeAsyncIterable is AsyncIterable<unknown> {
  if (maybeAsyncIterable == null || typeof maybeAsyncIterable !== 'object') {
    return false;
  }

  return typeof maybeAsyncIterable[Symbol.asyncIterator] === 'function';
}
