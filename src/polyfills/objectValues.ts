import type { ObjMap } from '../jsutils/ObjMap';

declare function objectValues<T>(obj: ObjMap<T>): Array<T>;

export const objectValues =
  Object.values || ((obj) => Object.keys(obj).map((key) => obj[key]));
