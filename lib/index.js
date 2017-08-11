// @flow

import Map from 'es6-map';

/**
 * The leaf node of a cache tree. Used to support variable argument length. A
 * unique object, so that native Maps will key it by reference.
 */
const LEAF = {};

/**
 * A value to represent a memoized undefined value. Allows efficient value
 * retrieval using Map.get only.
 */
const UNDEFINED = {};

/**
 * Default value for unset keys in native Maps
 */
const UNSET = undefined;

/**
 * Memoize all of the `properties` on an `object`.
 */
function memoize(
    // The object definition that should have its properties memoized.
    // (an object or an ImmutableJS.Record prototype)
    object: Object,
    // The list of properties names that should be memoized
    properties: string[],
    options: {
        // True if the methods in `properties` take arguments. This result in
        // slower memoization.
        takesArguments?: boolean
    } = {}
) {
    const { takesArguments = true } = options;

    for (const property of properties) {
        const original = object[property];

        if (!original) {
            throw new Error(`Object does not have a property named "${property}".`);
        }

        object[property] = function(...args) {
            if (!this.__cache) {
                this.__cache = new Map();
            }

            let cachedValue;

            let keys = [];
            if (takesArguments) {
                keys = [property, ...args];
                cachedValue = getIn(this.__cache, keys);
            } else {
                cachedValue = this.__cache.get(property);
            }

            // If we've got a result already, return it.
            if (cachedValue !== UNSET) {
                return cachedValue === UNDEFINED ? undefined : cachedValue;
            }

            // Otherwise calculate what it should be once and cache it.
            const value = original.apply(this, args);
            const v = value === undefined ? UNDEFINED : value;

            if (takesArguments) {
                this.__cache = setIn(this.__cache, keys, v);
            } else {
                this.__cache.set(property, v);
            }

            return value;
        };
    }
}

/**
 * Get a value at a key path in a tree of Map.
 *
 * If not set, returns UNSET.
 * If the set value is undefined, returns UNDEFINED.
 */
function getIn(
    map: Map,
    keys: string[]
): (any | typeof UNSET | typeof UNDEFINED) {
    for (const key of keys) {
        map = map.get(key);
        if (map === UNSET) return UNSET;
    }

    return map.get(LEAF);
}

/**
 * Set a value at a key path in a tree of Map, creating Maps on the go.
 */
function setIn(
    map: Map,
    keys: string[],
    value: any
): Map {
    let parent = map;
    let child;

    for (const key of keys) {
        child = parent.get(key);

        // If the path was not created yet...
        if (child === UNSET) {
            child = new Map();
            parent.set(key, child);
        }

        parent = child;
    }

    // The whole path has been created, so set the value to the bottom most map.
    child.set(LEAF, value);
    return map;
}

export default memoize;
