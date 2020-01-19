/**
 * Pick the value from an array.
 */
export declare type PickValue<T> = T extends ReadonlyArray<any> ? {
    [K in Extract<keyof T, number>]: PickValue<T[K]>;
}[number] : T;
/**
 * Flatten an `ArrayLike` object in TypeScript.
 */
export declare type FlatArray<T extends ArrayLike<any>> = Array<PickValue<T[number]>>;
/**
 * Flatten an array indefinitely.
 */
export declare function flatten<T extends ArrayLike<any>>(array: T): FlatArray<T>;
