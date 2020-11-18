export type ObjMap<T> = { __proto__: null; [key: string]: T };
export type ObjMapLike<T> =
  | ObjMap<T>
  | {
      [key: string]: T;
    };

export type ReadOnlyObjMap<T> = { __proto__: null; readonly [key: string]: T };
export type ReadOnlyObjMapLike<T> =
  | ReadOnlyObjMap<T>
  | {
      readonly [key: string]: T;
    };
