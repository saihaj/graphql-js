import type { ObjMap } from '../jsutils/ObjMap';

declare function objectEntries<T>(obj: ObjMap<T>): Array<[string, T]>;

// $FlowFixMe[name-already-bound] workaround for: https://github.com/facebook/flow/issues/4441
export const objectEntries =
  Object.entries || ((obj) => Object.keys(obj).map((key) => [key, obj[key]]));
