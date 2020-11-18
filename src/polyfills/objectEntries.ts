import { ObjMap } from '../jsutils/ObjMap';

declare function objectEntries<T>(obj: ObjMap<T>): Array<[string, T]>;

/* eslint-disable no-redeclare */

const objectEntries =
  Object.entries || ((obj) => Object.keys(obj).map((key) => [key, obj[key]]));

export default objectEntries;
