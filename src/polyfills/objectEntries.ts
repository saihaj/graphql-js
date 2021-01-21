import type { ObjMap } from '../jsutils/ObjMap';

declare function objectEntries<T>(obj: ObjMap<T>): Array<[string, T]>;

export const objectEntries =
  Object.entries || ((obj) => Object.keys(obj).map((key) => [key, obj[key]]));
