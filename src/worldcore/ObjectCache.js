const objectCache = new Map();

export function ClearObjectCache() {
    objectCache.forEach(value => value.destroy());
    objectCache.clear();
}

export function CachedObject(name, generator) {
    if (objectCache.has(name)) return objectCache.get(name);
    const obj = generator();
    objectCache.set(name, obj);
    return obj;
}
